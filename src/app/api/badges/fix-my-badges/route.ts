import { requireApproved } from '@/lib/guards';
import User from '@/models/User';
import Connection from '@/models/Connection';
import Badge from '@/models/Badge';
import { grantBadgeBySlug } from '@/lib/badges';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  console.log('Badge fix endpoint: POST request received');

  const gate = await requireApproved(req);
  if (!gate.ok) {
    console.log(
      'Badge fix endpoint: Gate failed:',
      gate.error,
      'Status:',
      gate.status
    );
    return Response.json({ error: gate.error }, { status: gate.status });
  }

  console.log(
    'Badge fix endpoint: Gate passed, user ID:',
    gate.session!.user.id
  );

  try {
    const authUserId = String(gate.session!.user.id);
    console.log('Badge fix endpoint: Processing for user:', authUserId);

    const U = await User;
    const C = await Connection;
    const B = await Badge;

    // First, ensure all badges exist by seeding them (same as admin seed)
    const requiredBadges = [
      // Connections & social
      {
        slug: 'first-connection',
        name: 'First Connection',
        icon: 'https://i.postimg.cc/8cPNq3qX/links.png',
        description:
          'Scan or be scanned by another volunteer for the first time.',
      },
      {
        slug: 'connections-5',
        name: 'Connector I (5)',
        icon: 'https://i.postimg.cc/8cPNq3qX/links.png',
        description: 'Make 5 unique volunteer connections.',
      },
      {
        slug: 'connections-10',
        name: 'Connector II (10)',
        icon: 'https://i.postimg.cc/8cPNq3qX/links.png',
        description: 'Make 10 unique volunteer connections.',
      },
      // Streaks
      {
        slug: 'streak-3',
        name: 'Streak 3',
        icon: 'https://i.postimg.cc/0QnJRVqf/fire.png',
        description: 'Active 3 days in a row.',
      },
      {
        slug: 'streak-7',
        name: 'Streak 7',
        icon: 'https://i.postimg.cc/0QnJRVqf/fire.png',
        description: 'Active 7 days in a row.',
      },
      // Profile
      {
        slug: 'profile-complete',
        name: 'Profile Complete',
        icon: 'https://i.postimg.cc/4dSDXxB2/profile.png',
        description: 'Fill out your profile details.',
      },
      // Levels (visual milestones)
      {
        slug: 'level-5',
        name: 'Level 5',
        icon: 'https://i.postimg.cc/rs0jkP5x/medal.png',
        description: 'Reach Level 5.',
      },
      {
        slug: 'level-10',
        name: 'Level 10',
        icon: 'https://i.postimg.cc/rs0jkP5x/medal.png',
        description: 'Reach Level 10.',
      },
      {
        slug: 'level-15',
        name: 'Level 15',
        icon: 'https://i.postimg.cc/rs0jkP5x/medal.png',
        description: 'Reach Level 15.',
      },
      {
        slug: 'level-20',
        name: 'Level 20',
        icon: 'https://i.postimg.cc/rs0jkP5x/medal.png',
        description: 'Reach Level 20.',
      },
      // Task completion milestones
      {
        slug: 'tasks-5',
        name: 'Task Master I',
        icon: 'https://i.postimg.cc/rs0jkP5x/medal.png',
        description: 'Complete 5 tasks.',
      },
      {
        slug: 'tasks-10',
        name: 'Task Master II',
        icon: 'https://i.postimg.cc/rs0jkP5x/medal.png',
        description: 'Complete 10 tasks.',
      },
      {
        slug: 'tasks-25',
        name: 'Task Master III',
        icon: 'https://i.postimg.cc/rs0jkP5x/medal.png',
        description: 'Complete 25 tasks.',
      },
      // XP milestones
      {
        slug: 'xp-1000',
        name: 'XP Collector I',
        icon: 'https://i.postimg.cc/rs0jkP5x/medal.png',
        description: 'Earn 1,000 XP.',
      },
      {
        slug: 'xp-5000',
        name: 'XP Collector II',
        icon: 'https://i.postimg.cc/rs0jkP5x/medal.png',
        description: 'Earn 5,000 XP.',
      },
      {
        slug: 'xp-10000',
        name: 'XP Collector III',
        icon: 'https://i.postimg.cc/rs0jkP5x/medal.png',
        description: 'Earn 10,000 XP.',
      },
    ];

    // Ensure badges exist and update their icons
    for (const badge of requiredBadges) {
      console.log(
        `Badge fix endpoint: Updating badge ${badge.slug} with icon ${badge.icon}`
      );
      await (
        await B
      ).updateOne(
        { slug: badge.slug },
        {
          $set: {
            name: badge.name,
            icon: badge.icon,
            description: badge.description,
          },
          $setOnInsert: {
            slug: badge.slug,
          },
        },
        { upsert: true }
      );
    }

    console.log('Badge fix endpoint: Ensured all badges exist');

    // Debug: Check what badges exist in database
    const allBadges = await (await B)
      .find({}, { slug: 1, name: 1, icon: 1 })
      .lean();
    console.log(
      'Badge fix endpoint: All badges in DB:',
      allBadges.map((b: any) => ({ slug: b.slug, name: b.name, icon: b.icon }))
    );

    // Get user info
    const user = await (
      await U
    )
      .findOne(
        { authUserId },
        {
          level: 1,
          xp: 1,
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
    console.log('Badge fix endpoint: User level:', user.level);
    console.log(
      'Badge fix endpoint: Current badge slugs:',
      Array.from(currentBadgeSlugs)
    );

    if (user.level >= 5) {
      if (!currentBadgeSlugs.has('level-5')) {
        console.log('Badge fix endpoint: Awarding level-5 badge');
        await grantBadgeBySlug(authUserId, 'level-5');
        awarded.push('level-5');
      } else {
        console.log('Badge fix endpoint: User already has level-5 badge');
        alreadyHave.push('level-5');
      }
    }

    if (user.level >= 10) {
      if (!currentBadgeSlugs.has('level-10')) {
        console.log('Badge fix endpoint: Awarding level-10 badge');
        await grantBadgeBySlug(authUserId, 'level-10');
        awarded.push('level-10');
      } else {
        console.log('Badge fix endpoint: User already has level-10 badge');
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

    // XP milestone badges
    const userXP = user.xp || 0;
    console.log('Badge fix endpoint: User XP:', userXP);

    if (userXP >= 1000) {
      if (!currentBadgeSlugs.has('xp-1000')) {
        console.log('Badge fix endpoint: Awarding xp-1000 badge');
        await grantBadgeBySlug(authUserId, 'xp-1000');
        awarded.push('xp-1000');
      } else {
        console.log('Badge fix endpoint: User already has xp-1000 badge');
        alreadyHave.push('xp-1000');
      }
    }

    if (userXP >= 5000) {
      if (!currentBadgeSlugs.has('xp-5000')) {
        console.log('Badge fix endpoint: Awarding xp-5000 badge');
        await grantBadgeBySlug(authUserId, 'xp-5000');
        awarded.push('xp-5000');
      } else {
        console.log('Badge fix endpoint: User already has xp-5000 badge');
        alreadyHave.push('xp-5000');
      }
    }

    if (userXP >= 10000) {
      if (!currentBadgeSlugs.has('xp-10000')) {
        console.log('Badge fix endpoint: Awarding xp-10000 badge');
        await grantBadgeBySlug(authUserId, 'xp-10000');
        awarded.push('xp-10000');
      } else {
        console.log('Badge fix endpoint: User already has xp-10000 badge');
        alreadyHave.push('xp-10000');
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
        xp: userXP,
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
