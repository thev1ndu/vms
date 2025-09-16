import { requireApproved } from '@/lib/guards';
import { z } from 'zod';
import Task from '@/models/Task';
import Participation from '@/models/Participation';
import User from '@/models/User';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireApproved(req);
  if (!gate.ok)
    return Response.json({ error: gate.error }, { status: gate.status });

  const authUserId = String(gate.session!.user.id);
  const { id: taskId } = await params;

  const T = await Task;
  const task = (await (await T).findById(taskId).lean()) as {
    _id: any;
    mode?: string;
    status?: string;
    levelRequirement?: number;
  } | null;
  if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });
  if (task.mode !== 'off-site') {
    return Response.json(
      { error: 'Only off-site tasks are appliable' },
      { status: 400 }
    );
  }
  if (task.status !== 'open') {
    return Response.json({ error: 'Task is not open' }, { status: 409 });
  }

  // Ensure user exists in app DB and meets level
  const U = await User;
  const me = (await (await U)
    .findOneAndUpdate(
      { authUserId },
      { $setOnInsert: { authUserId, xp: 0, level: 1, badges: [] } },
      { new: true, upsert: true }
    )
    .lean()) as {
    level?: number;
  } | null;

  if ((me?.level || 1) < (task.levelRequirement || 1)) {
    return Response.json(
      {
        error: `Level ${task.levelRequirement}+ required`,
        code: 'LEVEL_TOO_LOW',
      },
      { status: 403 }
    );
  }

  // Upsert participation as "applied"
  const P = await Participation;
  await (
    await P
  ).updateOne(
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
      // if user re-applies after being removed, ensure status at least "applied"
      $set: { mode: 'off-site' },
    },
    { upsert: true }
  );

  return Response.json({ ok: true, applied: true });
}
