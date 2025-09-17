import { requireApproved } from '@/lib/guards';
import User from '@/models/User';
import Badge from '@/models/Badge';
import Connection from '@/models/Connection';
import { grantBadgeBySlug } from '@/lib/badges';
import mongoose from 'mongoose';

export const runtime = 'nodejs';

type UserDoc = {
  _id: any;
  xp?: number;
  level?: number;
  badges?: any[];
  volunteerId?: string;
  displayName?: string;
  categoryPreferences?: string[];
};

export async function GET(req: Request) {
  const gate = await requireApproved(req);
  if (!gate.ok)
    return Response.json({ error: gate.error }, { status: gate.status });

  const authUserId = String(gate.session!.user.id);

  // Ensure a profile exists (idempotent)
  await User.updateOne(
    { authUserId },
    { $setOnInsert: { authUserId, xp: 0, level: 1, badges: [] } },
    { upsert: true }
  );

  const me = (await User.findOne(
    { authUserId },
    {
      xp: 1,
      level: 1,
      badges: 1,
      volunteerId: 1,
      displayName: 1,
      categoryPreferences: 1,
    }
  )
    .lean()
    .exec()) as UserDoc | null;

  // Safely coerce badge ids (string or ObjectId) -> ObjectId
  const badgeIds = (me?.badges || [])
    .map((id: any) => {
      try {
        return new mongoose.Types.ObjectId(id);
      } catch {
        return null;
      }
    })
    .filter(Boolean) as mongoose.Types.ObjectId[];

  const docs = badgeIds.length
    ? ((await (
        await Badge
      )
        .find({ _id: { $in: badgeIds } }, { name: 1, icon: 1, slug: 1 })
        .lean()
        .exec()) as {
        _id: any;
        name?: string;
        icon?: string;
        slug?: string;
      }[])
    : [];

  const connections = await (
    await Connection
  ).countDocuments({
    $or: [{ a: authUserId }, { b: authUserId }],
  });

  // Check profile completion and award badge if needed
  const fullProfile = await User.findOne(
    { authUserId },
    { displayName: 1, email: 1, volunteer: 1, badges: 1 }
  ).lean();

  if (fullProfile) {
    const isProfileComplete = !!(
      fullProfile.displayName &&
      fullProfile.email &&
      fullProfile.volunteer?.alias &&
      fullProfile.volunteer?.avatarUrl
    );

    if (isProfileComplete) {
      // Check if user already has profile-complete badge
      const currentBadgeIds = (fullProfile.badges || []).map((b: any) =>
        String(b)
      );
      const currentBadges = await Badge.find(
        { _id: { $in: currentBadgeIds } },
        { slug: 1 }
      ).lean();

      const hasProfileBadge = currentBadges.some(
        (b: any) => b.slug === 'profile-complete'
      );
      if (!hasProfileBadge) {
        await grantBadgeBySlug(authUserId, 'profile-complete');
      }
    }
  }

  return Response.json({
    me: {
      xp: me?.xp ?? 0,
      level: me?.level ?? 1,
      volunteerId: me?.volunteerId ?? null,
      displayName: me?.displayName ?? null,
      categoryPreferences: me?.categoryPreferences ?? [],
      badges: docs.map((d: any) => ({
        _id: String(d._id),
        name: d.name,
        icon: d.icon,
        slug: d.slug,
      })),
      connections,
    },
  });
}
