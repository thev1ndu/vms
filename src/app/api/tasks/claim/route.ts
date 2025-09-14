import Task from '@/models/Task';
import Participation from '@/models/Participation';
import User from '@/models/User';
import { requireApproved } from '@/lib/guards';
import { z } from 'zod';

type TaskDoc = {
  _id: any;
  mode?: string;
  status?: string;
  levelRequirement?: number;
  volunteersAssigned?: string[];
  volunteersRequired?: number;
};

/**
 * Accepts either a TASK QR payload or a raw taskId in the body.
 * Ensures: user is approved, level gate enforced, capacity-safe join, idempotent.
 */
const Body = z.object({
  payload: z
    .object({
      v: z.number(),
      kind: z.literal('TASK'),
      taskId: z.string(),
    })
    .optional(),
  taskId: z.string().optional(),
});

export async function POST(req: Request) {
  // Require signed-in + approved user
  const gate = await requireApproved(req);
  if (!gate.ok)
    return Response.json({ error: gate.error }, { status: gate.status });

  // Robust JSON + Zod handling
  let json: unknown = {};
  try {
    json = await req.json();
  } catch {
    /* allow empty */
  }
  const parsed = Body.safeParse(json);
  const payload = parsed.success ? parsed.data.payload : undefined;
  const bodyTaskId = parsed.success ? parsed.data.taskId : undefined;

  const authUserId = String(gate.session!.user.id);
  const taskId = payload?.taskId || bodyTaskId;
  if (!taskId)
    return Response.json({ error: 'Missing taskId/payload' }, { status: 400 });

  // Load task
  const task = await Task.findById(taskId).lean<TaskDoc>().exec();
  if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });
  if (task.mode !== 'on-site') {
    return Response.json(
      { error: 'Only on-site tasks can be claimed via QR' },
      { status: 400 }
    );
  }
  if (task.status !== 'open') {
    return Response.json({ error: 'Task is not open' }, { status: 409 });
  }

  // Ensure app user exists
  type UserProfile = { level?: number };
  const me = ((await User.findOneAndUpdate(
    { authUserId },
    { $setOnInsert: { authUserId, xp: 0, level: 1, badges: [] } },
    { upsert: true, new: true }
  )
    .lean()
    .exec()) as UserProfile) || { level: 1 };

  // Level gate
  const myLevel = me.level ?? 1;
  const reqLevel = task.levelRequirement ?? 1;
  if (myLevel < reqLevel) {
    return Response.json(
      { error: `Level ${reqLevel}+ required`, code: 'LEVEL_TOO_LOW' },
      { status: 403 }
    );
  }

  // Already joined?
  const alreadyInArray = (task.volunteersAssigned ?? []).includes(authUserId);
  const alreadyParticipation = !!(await Participation.findOne({
    taskId: String(task._id),
    authUserId,
  }).lean());
  if (alreadyInArray || alreadyParticipation) {
    return Response.json({ ok: true, message: 'Already joined this task.' });
  }

  // Atomic capacity check + join
  const result = await Task.updateOne(
    {
      _id: task._id,
      status: 'open',
      volunteersAssigned: { $ne: authUserId },
      $expr: {
        $lt: [
          { $size: { $ifNull: ['$volunteersAssigned', []] } },
          '$volunteersRequired',
        ],
      },
    },
    { $addToSet: { volunteersAssigned: authUserId } }
  );

  if (!result.modifiedCount) {
    // Re-check reason
    const fresh = await Task.findById(task._id).lean<TaskDoc>().exec();
    if (!fresh)
      return Response.json({ error: 'Task disappeared' }, { status: 404 });
    const full =
      (fresh.volunteersAssigned?.length ?? 0) >=
      (fresh.volunteersRequired ?? 0);
    const closed = fresh.status !== 'open';
    return Response.json(
      {
        error: full
          ? 'Task is full'
          : closed
          ? 'Task is not open'
          : 'Join failed (race)',
      },
      { status: 409 }
    );
  }

  // Upsert participation as "accepted" (completion comes later)
  await Participation.updateOne(
    { taskId: String(task._id), authUserId },
    {
      $setOnInsert: {
        taskId: String(task._id),
        authUserId,
        mode: 'on-site',
        status: 'accepted',
        xpEarned: 0,
        badgesEarned: [],
      },
    },
    { upsert: true }
  );

  type TaskCounts = {
    volunteersAssigned?: string[];
    volunteersRequired?: number;
  };
  const updated = await Task.findById(task._id, {
    volunteersAssigned: 1,
    volunteersRequired: 1,
  })
    .lean<TaskCounts>()
    .exec();

  return Response.json({
    ok: true,
    joined: true,
    assigned: updated?.volunteersAssigned?.length ?? 0,
    required: updated?.volunteersRequired ?? 0,
  });
}
