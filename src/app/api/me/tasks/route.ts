import { requireApproved } from '@/lib/guards';
import Participation from '@/models/Participation';
import Task from '@/models/Task';

export async function GET(req: Request) {
  const gate = await requireApproved(req);
  if (!gate.ok)
    return Response.json({ error: gate.error }, { status: gate.status });

  const authUserId = String(gate.session!.user.id);
  const parts = await Participation.find({ authUserId }).lean();
  const ids = [...new Set(parts.map((p) => p.taskId))];
  const tasks = await Task.find({ _id: { $in: ids } }).lean();
  const taskById = new Map(tasks.map((t) => [String(t._id), t]));

  const decorate = (s: string) =>
    parts
      .filter((p) => p.status === s)
      .map((p) => ({
        ...p,
        task: taskById.get(p.taskId) || null,
      }));

  return Response.json({
    applied: decorate('applied'),
    accepted: decorate('accepted'),
    completed: decorate('completed'),
  });
}
