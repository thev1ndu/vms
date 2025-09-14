import { z } from 'zod';
import { requireApproved } from '@/lib/guards';
import Participation from '@/models/Participation';

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
  const res = await Participation.deleteOne({
    taskId: parsed.data.taskId,
    authUserId,
    status: 'applied',
    mode: 'off-site',
  });

  return Response.json({ ok: true, removed: res.deletedCount > 0 });
}
