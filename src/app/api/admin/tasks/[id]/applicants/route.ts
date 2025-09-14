import { requireAdmin } from '@/lib/guards';
import Participation from '@/models/Participation';
import User from '@/models/User';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin(req);
  if (!gate.ok)
    return Response.json({ error: gate.error }, { status: gate.status });

  const { id: taskId } = await params;
  const P = await Participation;
  const applicants = await (await P)
    .find({ taskId, status: 'applied' }, { authUserId: 1, createdAt: 1 })
    .lean();

  const ids = applicants.map((a) => a.authUserId);
  const U = await User;
  const profs = await (await U)
    .find(
      { authUserId: { $in: ids } },
      { authUserId: 1, volunteerId: 1, chatTag: 1, level: 1, xp: 1 }
    )
    .lean();

  const byId = new Map(profs.map((p: any) => [p.authUserId, p]));
  const rows = applicants.map((a) => {
    const p: any = byId.get(a.authUserId) || {};
    return {
      authUserId: a.authUserId,
      appliedAt: a.createdAt,
      volunteerId: p.volunteerId ?? null,
      chatTag: p.chatTag ?? null,
      level: p.level ?? 1,
      xp: p.xp ?? 0,
    };
  });

  return Response.json({ applicants: rows });
}
