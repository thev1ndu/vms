import { requireAdmin } from '@/lib/guards';
import { z } from 'zod';
import Task from '@/models/Task';
import Participation from '@/models/Participation';

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
  const task = (await (await T).findById(taskId).lean()) as {
    _id: any;
    mode?: string;
    status?: string;
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
  return Response.json({
    ok: true,
    assigned: fresh?.volunteersAssigned?.length || 0,
    required: fresh?.volunteersRequired || 0,
  });
}
