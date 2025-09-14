import { requireApproved } from '@/lib/guards';
import User from '@/models/User';
import Badge from '@/models/Badge';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ authUserId: string }> }
) {
  const gate = await requireApproved(req);
  if (!gate.ok) {
    return Response.json({ error: gate.error }, { status: gate.status });
  }

  const { authUserId } = await params;

  try {
    // Get user with their badges
    const user = await User.findOne({ authUserId }, { badges: 1 }).lean();

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Get badge details
    const badgeIds = user.badges || [];
    const badges = await Badge.find(
      { _id: { $in: badgeIds } },
      { slug: 1, name: 1, icon: 1, description: 1 }
    ).lean();

    return Response.json({
      badges: badges.map((badge: any) => ({
        slug: badge.slug,
        name: badge.name,
        icon: badge.icon,
        description: badge.description,
      })),
    });
  } catch (error) {
    console.error('Error fetching user badges:', error);
    return Response.json({ error: 'Failed to fetch badges' }, { status: 500 });
  }
}
