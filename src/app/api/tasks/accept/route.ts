import { z } from 'zod';
import { requireAdmin } from '@/lib/guards';
import Task from '@/models/Task';
import Participation from '@/models/Participation';

const Body = z.object({ taskId: z.string(), authUserId: z.string() });

export async function POST(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok)
    return Response.json({ error: gate.error }, { status: gate.status });

  // Parse body
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: 'Bad JSON' }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success)
    return Response.json({ error: 'Invalid body' }, { status: 400 });

  const { taskId, authUserId } = parsed.data;

  // Load task (narrow projection)
  const task = (await Task.findById(taskId, {
    mode: 1,
    status: 1,
    volunteersAssigned: 1,
    volunteersRequired: 1,
  }).lean()) as {
    mode?: string;
    status?: string;
    volunteersAssigned?: string[];
    volunteersRequired?: number;
  } | null;
  if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });
  if (task.mode !== 'off-site') {
    return Response.json(
      { error: 'Accept applies to off-site tasks' },
      { status: 400 }
    );
  }
  if (task.status !== 'open') {
    return Response.json({ error: 'Task not open' }, { status: 409 });
  }

  // If already accepted/completed, short-circuit (no capacity churn)
  const existing = (await Participation.findOne(
    { taskId: String(taskId), authUserId },
    { status: 1 }
  ).lean()) as { status?: string } | null;

  if (existing?.status === 'accepted') {
    const assigned = task.volunteersAssigned?.length ?? 0;
    const required = task.volunteersRequired ?? 0;
    return Response.json({
      ok: true,
      assigned,
      required,
      message: 'Already accepted',
    });
  }
  if (existing?.status === 'completed') {
    return Response.json(
      { error: 'Already completed for this task' },
      { status: 409 }
    );
  }

  // Capacity-safe add to volunteersAssigned (atomic)
  const capRes = await Task.updateOne(
    {
      _id: taskId,
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

  if (!capRes.modifiedCount) {
    const fresh = (await Task.findById(taskId, {
      volunteersAssigned: 1,
      volunteersRequired: 1,
      status: 1,
    }).lean()) as {
      volunteersAssigned?: string[];
      volunteersRequired?: number;
      status?: string;
    } | null;
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
          : 'Race lost',
      },
      { status: 409 }
    );
  }

  // Promote/Upsert participation -> accepted (don’t downgrade completed)
  await Participation.updateOne(
    { taskId: String(taskId), authUserId, status: { $ne: 'completed' } },
    {
      $set: { mode: 'off-site', status: 'accepted' },
      $setOnInsert: { xpEarned: 0, badgesEarned: [] },
    },
    { upsert: true }
  );

  // Return updated counts
  const updated = (await Task.findById(taskId, {
    volunteersAssigned: 1,
    volunteersRequired: 1,
  }).lean()) as {
    volunteersAssigned?: string[];
    volunteersRequired?: number;
  } | null;
  return Response.json({
    ok: true,
    assigned: updated?.volunteersAssigned?.length ?? 0,
    required: updated?.volunteersRequired ?? 0,
  });
}
