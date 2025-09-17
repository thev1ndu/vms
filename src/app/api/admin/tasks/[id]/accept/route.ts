import { requireAdmin } from '@/lib/guards';
import { z } from 'zod';
import Task from '@/models/Task';
import Participation from '@/models/Participation';
import User from '@/models/User';
import { sendTaskAcceptanceNotificationEmail } from '@/lib/email';
import { authDb } from '@/lib/auth';
import { ObjectId } from 'mongodb';

const Body = z.object({ authUserId: z.string() });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin(req);
  if (!gate.ok)
    return Response.json({ error: gate.error }, { status: gate.status });

  const { authUserId } = Body.parse(await req.json());
  const { id: taskId } = await params;

  const T = await Task;
  const task = (await (
    await T
  )
    .findById(taskId, {
      mode: 1,
      status: 1,
      title: 1,
      description: 1,
      category: 1,
      xpReward: 1,
      volunteersRequired: 1,
    })
    .lean()) as {
    _id: any;
    mode?: string;
    status?: string;
    title?: string;
    description?: string;
    category?: string;
    xpReward?: number;
    volunteersRequired?: number;
  } | null;
  if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });
  if (task.mode !== 'off-site')
    return Response.json({ error: 'Not an off-site task' }, { status: 400 });
  if (task.status !== 'open')
    return Response.json({ error: 'Task is not open' }, { status: 409 });

  // Atomic accept under capacity
  const res = await (
    await T
  ).updateOne(
    {
      _id: task._id,
      status: 'open',
      volunteersAssigned: { $ne: authUserId },
      $expr: { $lt: [{ $size: '$volunteersAssigned' }, '$volunteersRequired'] },
    },
    { $addToSet: { volunteersAssigned: authUserId } }
  );

  if (!res.modifiedCount) {
    const fresh = (await (await T).findById(task._id).lean()) as {
      volunteersAssigned?: string[];
      volunteersRequired?: number;
    } | null;
    const full =
      (fresh?.volunteersAssigned?.length || 0) >=
      (fresh?.volunteersRequired || 0);
    return Response.json(
      { error: full ? 'Task is full' : 'Accept failed' },
      { status: 409 }
    );
  }

  const P = await Participation;
  await (
    await P
  ).updateOne(
    { taskId: String(task._id), authUserId },
    {
      $set: {
        mode: 'off-site',
        status: 'accepted',
      },
      $setOnInsert: {
        taskId: String(task._id),
        authUserId,
        xpEarned: 0,
        badgesEarned: [],
      },
    },
    { upsert: true }
  );

  const fresh = (await (await T)
    .findById(task._id, { volunteersAssigned: 1, volunteersRequired: 1 })
    .lean()) as {
    volunteersAssigned?: string[];
    volunteersRequired?: number;
  } | null;

  // Send email notification to the accepted user if acceptance was successful
  if (res.modifiedCount > 0) {
    try {
      // Get user information from auth database
      const authUsersColl = authDb.collection('user');
      const userAuth = await authUsersColl.findOne({
        _id: new ObjectId(authUserId),
      });

      // Get user app profile
      const userProfile = await User.findOne(
        { authUserId },
        { volunteerId: 1, displayName: 1, name: 1 }
      ).lean();

      if (userAuth) {
        const emailResult = await sendTaskAcceptanceNotificationEmail({
          userEmail: userAuth.email,
          userName:
            userProfile?.displayName || userProfile?.name || userAuth.name,
          userVolunteerId: userProfile?.volunteerId,
          taskTitle: task.title || 'Untitled Task',
          taskDescription: task.description || 'No description',
          taskMode: task.mode || 'off-site',
          taskCategory: task.category || 'Uncategorized',
          taskXpReward: task.xpReward || 0,
          assignedCount: fresh?.volunteersAssigned?.length || 0,
          requiredCount: fresh?.volunteersRequired || 0,
        });

        if (!emailResult.success) {
          console.error(
            'Failed to send task acceptance notification email:',
            emailResult.error
          );
          // Don't fail the acceptance process if email fails
        }
      }
    } catch (emailError) {
      console.error(
        'Error sending task acceptance notification email:',
        emailError
      );
      // Don't fail the acceptance process if email fails
    }
  }

  return Response.json({
    ok: true,
    assigned: fresh?.volunteersAssigned?.length || 0,
    required: fresh?.volunteersRequired || 0,
  });
}
