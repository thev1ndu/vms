import { requireApproved } from '@/lib/guards';
import User from '@/models/User';
import Badge from '@/models/Badge';
import Connection from '@/models/Connection';
import mongoose from 'mongoose';

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
    // Get user data
    const user = await User.findOne(
      { authUserId },
      { xp: 1, level: 1, badges: 1, volunteerId: 1, chatTag: 1, name: 1 }
    ).lean();

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Safely coerce badge ids (string or ObjectId) -> ObjectId
    const badgeIds = (user.badges || [])
      .map((id: any) => {
        try {
          return new mongoose.Types.ObjectId(id);
        } catch {
          return null;
        }
      })
      .filter(Boolean) as mongoose.Types.ObjectId[];

    const badges = badgeIds.length
      ? ((await Badge.find(
          { _id: { $in: badgeIds } },
          { name: 1, icon: 1, slug: 1 }
        )
          .lean()
          .exec()) as {
          _id: any;
          name?: string;
          icon?: string;
          slug?: string;
        }[])
      : [];

    const connections = await Connection.countDocuments({
      $or: [{ a: authUserId }, { b: authUserId }],
    });

    return Response.json({
      me: {
        xp: user.xp ?? 0,
        level: user.level ?? 1,
        volunteerId: user.volunteerId ?? null,
        chatTag: user.chatTag ?? null,
        name: user.name ?? null,
        badges: badges.map((d: any) => ({
          _id: String(d._id),
          name: d.name,
          icon: d.icon,
          slug: d.slug,
        })),
        connections,
      },
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    return Response.json(
      { error: 'Failed to fetch user data' },
      { status: 500 }
    );
  }
}
