import { requireApproved } from '@/lib/guards';
import User from '@/models/User';
import Connection from '@/models/Connection';
import Badge from '@/models/Badge';
import { grantBadgeBySlug } from '@/lib/badges';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const gate = await requireApproved(req);
  if (!gate.ok)
    return Response.json({ error: gate.error }, { status: gate.status });

  try {
    const authUserId = String(gate.session!.user.id);

    const U = await User;
    const C = await Connection;
    const B = await Badge;

    // Get user info
    const user = await (
      await U
    )
      .findOne(
        { authUserId },
        {
          level: 1,
          badges: 1,
          displayName: 1,
          email: 1,
          volunteer: 1,
        }
      )
      .lean();

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Get current badges
    const currentBadgeIds = (user.badges || []).map((b: any) => String(b));
    const currentBadges = await (await B)
      .find({ _id: { $in: currentBadgeIds } }, { slug: 1, name: 1 })
      .lean();

    const currentBadgeSlugs = new Set(currentBadges.map((b: any) => b.slug));

    // Check what badges they should have
    const awarded = [];
    const alreadyHave = [];

    // Level badges
    if (user.level >= 5) {
      if (!currentBadgeSlugs.has('level-5')) {
        await grantBadgeBySlug(authUserId, 'level-5');
        awarded.push('level-5');
      } else {
        alreadyHave.push('level-5');
      }
    }

    if (user.level >= 10) {
      if (!currentBadgeSlugs.has('level-10')) {
        await grantBadgeBySlug(authUserId, 'level-10');
        awarded.push('level-10');
      } else {
        alreadyHave.push('level-10');
      }
    }

    // Connection badges
    const connectionCount = await (
      await C
    ).countDocuments({
      $or: [{ a: authUserId }, { b: authUserId }],
    });

    if (connectionCount >= 1) {
      if (!currentBadgeSlugs.has('first-connection')) {
        await grantBadgeBySlug(authUserId, 'first-connection');
        awarded.push('first-connection');
      } else {
        alreadyHave.push('first-connection');
      }
    }

    if (connectionCount >= 5) {
      if (!currentBadgeSlugs.has('connections-5')) {
        await grantBadgeBySlug(authUserId, 'connections-5');
        awarded.push('connections-5');
      } else {
        alreadyHave.push('connections-5');
      }
    }

    if (connectionCount >= 10) {
      if (!currentBadgeSlugs.has('connections-10')) {
        await grantBadgeBySlug(authUserId, 'connections-10');
        awarded.push('connections-10');
      } else {
        alreadyHave.push('connections-10');
      }
    }

    // Profile completion badge
    const isProfileComplete = !!(
      user.displayName &&
      user.email &&
      user.volunteer?.alias &&
      user.volunteer?.avatarUrl
    );

    if (isProfileComplete) {
      if (!currentBadgeSlugs.has('profile-complete')) {
        await grantBadgeBySlug(authUserId, 'profile-complete');
        awarded.push('profile-complete');
      } else {
        alreadyHave.push('profile-complete');
      }
    }

    // Get updated badge list
    const updatedUser = await (await U)
      .findOne({ authUserId }, { badges: 1 })
      .lean();
    const updatedBadgeIds = (updatedUser?.badges || []).map((b: any) =>
      String(b)
    );
    const updatedBadges = await (await B)
      .find({ _id: { $in: updatedBadgeIds } }, { slug: 1, name: 1, icon: 1 })
      .lean();

    return Response.json({
      ok: true,
      user: {
        authUserId,
        level: user.level,
        connections: connectionCount,
        profileComplete: isProfileComplete,
      },
      badgesAwarded: awarded,
      badgesAlreadyHad: alreadyHave,
      totalBadgesNow: updatedBadges.length,
      allBadges: updatedBadges.map((b: any) => ({
        slug: b.slug,
        name: b.name,
        icon: b.icon,
      })),
      message:
        awarded.length > 0
          ? `🎉 Awarded ${awarded.length} missing badges!`
          : 'You already have all eligible badges',
    });
  } catch (error) {
    console.error('Badge fix error:', error);
    return Response.json(
      {
        error: 'Failed to fix badges',
      },
      { status: 500 }
    );
  }
}
