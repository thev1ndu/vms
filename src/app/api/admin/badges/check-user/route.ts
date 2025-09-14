import { requireAdmin } from '@/lib/guards';
import User from '@/models/User';
import Connection from '@/models/Connection';
import Badge from '@/models/Badge';
import { grantBadgeBySlug } from '@/lib/badges';
import { z } from 'zod';

export const runtime = 'nodejs';

const Body = z.object({ authUserId: z.string() });

export async function POST(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok)
    return Response.json({ error: gate.error }, { status: gate.status });

  try {
    const { authUserId } = Body.parse(await req.json());

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
    const shouldHave = [];
    const awarded = [];

    // Level badges
    if (user.level >= 5 && !currentBadgeSlugs.has('level-5')) {
      shouldHave.push('level-5');
      await grantBadgeBySlug(authUserId, 'level-5');
      awarded.push('level-5');
    }
    if (user.level >= 10 && !currentBadgeSlugs.has('level-10')) {
      shouldHave.push('level-10');
      await grantBadgeBySlug(authUserId, 'level-10');
      awarded.push('level-10');
    }

    // Connection badges
    const connectionCount = await (
      await C
    ).countDocuments({
      $or: [{ a: authUserId }, { b: authUserId }],
    });

    if (connectionCount >= 1 && !currentBadgeSlugs.has('first-connection')) {
      shouldHave.push('first-connection');
      await grantBadgeBySlug(authUserId, 'first-connection');
      awarded.push('first-connection');
    }
    if (connectionCount >= 5 && !currentBadgeSlugs.has('connections-5')) {
      shouldHave.push('connections-5');
      await grantBadgeBySlug(authUserId, 'connections-5');
      awarded.push('connections-5');
    }
    if (connectionCount >= 10 && !currentBadgeSlugs.has('connections-10')) {
      shouldHave.push('connections-10');
      await grantBadgeBySlug(authUserId, 'connections-10');
      awarded.push('connections-10');
    }

    // Profile completion badge
    const isProfileComplete = !!(
      user.displayName &&
      user.email &&
      user.volunteer?.alias &&
      user.volunteer?.avatarUrl
    );

    if (isProfileComplete && !currentBadgeSlugs.has('profile-complete')) {
      shouldHave.push('profile-complete');
      await grantBadgeBySlug(authUserId, 'profile-complete');
      awarded.push('profile-complete');
    }

    return Response.json({
      ok: true,
      user: {
        authUserId,
        level: user.level,
        connections: connectionCount,
        profileComplete: isProfileComplete,
      },
      currentBadges: currentBadges.map((b: any) => ({
        slug: b.slug,
        name: b.name,
      })),
      badgesAwarded: awarded,
      message:
        awarded.length > 0
          ? `Awarded ${awarded.length} missing badges!`
          : 'User already has all eligible badges',
    });
  } catch (error) {
    console.error('Badge check error:', error);
    return Response.json(
      {
        error: 'Failed to check/award badges',
      },
      { status: 500 }
    );
  }
}
