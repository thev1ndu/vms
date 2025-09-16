import { requireAdmin } from '@/lib/guards';
import User from '@/models/User';
import Connection from '@/models/Connection';
import { grantBadgeBySlug } from '@/lib/badges';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok)
    return Response.json({ error: gate.error }, { status: gate.status });

  try {
    const U = await User;
    const C = await Connection;

    // Get all users
    const users = await (await U)
      .find({}, { authUserId: 1, level: 1, badges: 1 })
      .lean();

    let totalAwarded = 0;
    const results = [];

    for (const user of users) {
      const authUserId = user.authUserId;
      const currentBadges = new Set(
        (user.badges || []).map((b: any) => String(b))
      );
      let userAwarded = 0;

      // Check level badges
      if (user.level >= 5 && !currentBadges.has('level-5')) {
        await grantBadgeBySlug(authUserId, 'level-5');
        userAwarded++;
      }
      if (user.level >= 10 && !currentBadges.has('level-10')) {
        await grantBadgeBySlug(authUserId, 'level-10');
        userAwarded++;
      }

      // Check connection badges
      const connectionCount = await (
        await C
      ).countDocuments({
        $or: [{ a: authUserId }, { b: authUserId }],
      });

      if (connectionCount >= 1 && !currentBadges.has('first-connection')) {
        await grantBadgeBySlug(authUserId, 'first-connection');
        userAwarded++;
      }
      if (connectionCount >= 5 && !currentBadges.has('connections-5')) {
        await grantBadgeBySlug(authUserId, 'connections-5');
        userAwarded++;
      }
      if (connectionCount >= 10 && !currentBadges.has('connections-10')) {
        await grantBadgeBySlug(authUserId, 'connections-10');
        userAwarded++;
      }

      // Check profile completion badge
      const fullUser = await (
        await U
      )
        .findOne(
          { authUserId },
          {
            displayName: 1,
            email: 1,
            volunteer: 1,
          }
        )
        .lean();

      const isProfileComplete = !!(
        fullUser?.displayName &&
        fullUser?.email &&
        fullUser?.volunteer?.alias &&
        fullUser?.volunteer?.avatarUrl
      );

      if (isProfileComplete && !currentBadges.has('profile-complete')) {
        await grantBadgeBySlug(authUserId, 'profile-complete');
        userAwarded++;
      }

      if (userAwarded > 0) {
        results.push({
          authUserId,
          level: user.level,
          connections: connectionCount,
          badgesAwarded: userAwarded,
        });
        totalAwarded += userAwarded;
      }
    }

    return Response.json({
      ok: true,
      totalUsersProcessed: users.length,
      totalBadgesAwarded: totalAwarded,
      usersWithNewBadges: results.length,
      details: results,
    });
  } catch (error) {
    console.error('Retroactive badge awarding error:', error);
    return Response.json(
      {
        error: 'Failed to award retroactive badges',
      },
      { status: 500 }
    );
  }
}
