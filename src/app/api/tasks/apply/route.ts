import { z } from 'zod';
import { requireApproved } from '@/lib/guards';
import Task from '@/models/Task';
import Participation from '@/models/Participation';
import User from '@/models/User';
import { sendTaskApplicationEmail } from '@/lib/email';
import { authDb } from '@/lib/auth';
import { ObjectId } from 'mongodb';

type TaskDoc = {
  _id: any;
  mode?: string;
  status?: string;
  levelRequirement?: number;
  title?: string;
  description?: string;
  category?: string;
  xpReward?: number;
  createdBy?: string;
  createdByEmail?: string;
};

type UserProfile = {
  level?: number;
};

const Body = z.object({ taskId: z.string() });

export async function POST(req: Request) {
  const gate = await requireApproved(req);
  if (!gate.ok)
    return Response.json({ error: gate.error }, { status: gate.status });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Bad JSON' }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success)
    return Response.json({ error: 'Invalid body' }, { status: 400 });

  const authUserId = String(gate.session!.user.id);
  const task = await Task.findById(parsed.data.taskId, {
    mode: 1,
    status: 1,
    levelRequirement: 1,
    title: 1,
    description: 1,
    category: 1,
    xpReward: 1,
    createdBy: 1,
    createdByEmail: 1,
  })
    .lean<TaskDoc>()
    .exec();
  if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });
  if (task.mode !== 'off-site')
    return Response.json(
      { error: 'Only off-site tasks can be applied' },
      { status: 400 }
    );
  if (task.status !== 'open')
    return Response.json({ error: 'Task is not open' }, { status: 409 });

  // Ensure app user doc exists
  await User.updateOne(
    { authUserId },
    { $setOnInsert: { authUserId, xp: 0, level: 1, badges: [] } },
    { upsert: true }
  );

  // Level gate
  const me = (await User.findOne({ authUserId }, { level: 1 })
    .lean()
    .exec()) as UserProfile | null;
  if ((me?.level ?? 1) < (task.levelRequirement ?? 1)) {
    return Response.json(
      { error: `Level ${task.levelRequirement}+ required` },
      { status: 403 }
    );
  }

  // Idempotent create "applied"
  const participationResult = await Participation.updateOne(
    { taskId: String(task._id), authUserId },
    {
      $setOnInsert: {
        taskId: String(task._id),
        authUserId,
        mode: 'off-site',
        status: 'applied',
        xpEarned: 0,
        badgesEarned: [],
      },
    },
    { upsert: true }
  );

  // Send email notification to task creator if this is a new application
  if (participationResult.upsertedCount > 0 && task.createdByEmail) {
    try {
      // Get applicant information from auth database
      const authUsersColl = authDb.collection('user');
      const applicantAuth = await authUsersColl.findOne({
        _id: new ObjectId(authUserId),
      });

      // Get applicant app profile
      const applicantProfile = await User.findOne(
        { authUserId },
        { volunteerId: 1, displayName: 1, name: 1 }
      ).lean();

      // Get creator information from auth database
      const creatorAuth = await authUsersColl.findOne({
        _id: new ObjectId(task.createdBy),
      });

      if (applicantAuth && creatorAuth) {
        const emailResult = await sendTaskApplicationEmail({
          creatorEmail: task.createdByEmail,
          creatorName: creatorAuth.name,
          applicantEmail: applicantAuth.email,
          applicantName:
            applicantProfile?.displayName ||
            applicantProfile?.name ||
            applicantAuth.name,
          applicantVolunteerId: applicantProfile?.volunteerId,
          taskTitle: task.title || 'Untitled Task',
          taskDescription: task.description || 'No description',
          taskMode: task.mode || 'off-site',
          taskCategory: task.category || 'Uncategorized',
          taskXpReward: task.xpReward || 0,
        });

        if (!emailResult.success) {
          console.error(
            'Failed to send task application email:',
            emailResult.error
          );
          // Don't fail the application process if email fails
        }
      }
    } catch (emailError) {
      console.error('Error sending task application email:', emailError);
      // Don't fail the application process if email fails
    }
  }

  return Response.json({ ok: true });
}
