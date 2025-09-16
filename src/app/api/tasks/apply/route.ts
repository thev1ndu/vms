import { z } from 'zod';
import { requireApproved } from '@/lib/guards';
import Task from '@/models/Task';
import Participation from '@/models/Participation';
import User from '@/models/User';

type TaskDoc = {
  _id: any;
  mode?: string;
  status?: string;
  levelRequirement?: number;
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
  const task = await Task.findById(parsed.data.taskId).lean<TaskDoc>().exec();
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
  await Participation.updateOne(
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

  return Response.json({ ok: true });
}
