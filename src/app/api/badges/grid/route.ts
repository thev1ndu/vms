import { requireApproved } from '@/lib/guards';
import Badge from '@/models/Badge';
import User from '@/models/User';
import mongoose from 'mongoose';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const gate = await requireApproved(req);
  if (!gate.ok)
    return Response.json({ error: gate.error }, { status: gate.status });

  const authUserId = String(gate.session!.user.id);

  // Get the user's badge IDs (may be strings or ObjectIds)
  const U = await User;
  const me = (await (await U)
    .findOne({ authUserId }, { badges: 1 })
    .lean()) as { badges?: any[] } | null;

  const earnedObjectIds: mongoose.Types.ObjectId[] = (me?.badges || [])
    .map((id: any) => {
      try {
        return new mongoose.Types.ObjectId(id);
      } catch {
        return null;
      }
    })
    .filter(Boolean) as mongoose.Types.ObjectId[];

  // If none earned, return an empty list
  if (!earnedObjectIds.length) {
    return Response.json({ badges: [] });
  }

  // Fetch only earned badges
  const B = await Badge;
  const earned = await (
    await B
  )
    .find(
      { _id: { $in: earnedObjectIds } },
      { name: 1, slug: 1, icon: 1, description: 1 }
    )
    .sort({ name: 1 })
    .lean();

  // All returned badges are earned
  const badges = earned.map((b: any) => ({
    _id: String(b._id),
    slug: b.slug,
    name: b.name,
    icon: b.icon,
    description: b.description || '',
    earned: true,
  }));

  console.log(
    'Badge grid: Returning badges:',
    badges.map((b) => ({ name: b.name, icon: b.icon }))
  );

  return Response.json({ badges });
}
