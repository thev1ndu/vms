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
  const parts = await (
    await P
  )
    .find(
      { taskId, status: { $in: ['accepted', 'completed'] } },
      {
        authUserId: 1,
        createdAt: 1,
        status: 1,
        proof: 1,
        completedAt: 1,
      }
    )
    .lean();

  const ids = parts.map((p) => p.authUserId);
  const U = await User;
  const profs = await (await U)
    .find(
      { authUserId: { $in: ids } },
      { authUserId: 1, volunteerId: 1, chatTag: 1, level: 1, xp: 1 }
    )
    .lean();

  const byId = new Map(profs.map((p: any) => [p.authUserId, p]));
  const rows = parts.map((p) => {
    const u: any = byId.get(p.authUserId) || {};
    return {
      authUserId: p.authUserId,
      joinedAt: p.createdAt,
      volunteerId: u.volunteerId ?? null,
      chatTag: u.chatTag ?? null,
      level: u.level ?? 1,
      xp: u.xp ?? 0,
      status: p.status,
      proof: p.proof ?? null,
      completedAt: p.completedAt ?? null,
    };
  });

  return Response.json({ participants: rows });
}
