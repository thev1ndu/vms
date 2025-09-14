import { requireApproved } from '@/lib/guards';
import Badge from '@/models/Badge';
import User from '@/models/User';

export async function GET(req: Request) {
  const gate = await requireApproved(req);
  if (!gate.ok)
    return Response.json({ error: gate.error }, { status: gate.status });

  const authUserId = String(gate.session!.user.id);

  // Ensure user doc exists (idempotent)
  const me = (await (await User)
    .findOneAndUpdate(
      { authUserId },
      { $setOnInsert: { authUserId, xp: 0, level: 1, badges: [] } },
      { new: true, upsert: true, projection: { badges: 1 } }
    )
    .lean()) as {
    badges?: any[];
  } | null;

  const myBadges = new Set((me?.badges || []).map((id: any) => String(id)));

  const all = (await (await Badge)
    .find({}, { name: 1, slug: 1, icon: 1, description: 1 })
    .sort({ name: 1 })
    .lean()) as {
    _id: any;
    name?: string;
    slug?: string;
    icon?: string;
    description?: string;
  }[];

  const badges = all.map((b: any) => ({
    _id: String(b._id),
    name: b.name,
    slug: b.slug,
    icon: b.icon || null,
    description: b.description || null,
    earned: myBadges.has(String(b._id)),
  }));

  // Sort: earned first, then by name
  badges.sort(
    (a, b) =>
      Number(b.earned) - Number(a.earned) || a.name.localeCompare(b.name)
  );

  return Response.json({
    badges,
    totals: {
      earned: badges.filter((b) => b.earned).length,
      total: badges.length,
    },
  });
}
