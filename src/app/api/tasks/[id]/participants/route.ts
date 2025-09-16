import { requireAdmin } from '@/lib/guards';
import Participation from '@/models/Participation';
import User from '@/models/User';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin(req);
  if (!gate.ok) {
    return Response.json({ error: gate.error }, { status: gate.status });
  }

  const { id: taskId } = await params;

  // Only participants (accepted). No mode filter -> works for on-site & off-site.
  const parts = await Participation.find(
    { taskId, status: 'accepted' },
    { authUserId: 1, createdAt: 1 } // narrow projection
  )
    .sort({ createdAt: 1 }) // oldest first
    .lean();

  if (!parts.length) {
    return Response.json({ participants: [] });
  }

  const ids = parts.map((p) => p.authUserId);

  const users = await User.find(
    { authUserId: { $in: ids } },
    { authUserId: 1, volunteerId: 1, displayName: 1, level: 1, xp: 1 }
  ).lean();

  const byId = new Map(users.map((u: any) => [u.authUserId, u]));

  const participants = parts.map((p) => {
    const u: any = byId.get(p.authUserId) || {};
    return {
      authUserId: p.authUserId,
      status: 'accepted',
      joinedAt: p.createdAt,
      volunteerId: u.volunteerId ?? null,
      displayName: u.displayName ?? null,
      level: u.level ?? 1,
      xp: u.xp ?? 0,
    };
  });

  return Response.json({ participants });
}
