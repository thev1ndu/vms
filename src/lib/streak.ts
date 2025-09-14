import User from '@/models/User';
import { grantBadgeBySlug } from './badges';

/**
 * Touch daily streak for a user.
 * - Increments streak if last activity was yesterday;
 * - Resets to 1 if before yesterday;
 * - Keeps as-is if already touched today.
 * - Grants streak badges when thresholds crossed (3, 7).
 */
export async function touchDailyStreak(authUserId: string) {
  const U = await User;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const doc = (await (await U)
    .findOne({ authUserId }, { 'streak.count': 1, 'streak.lastActiveAt': 1 })
    .lean()) as { streak?: { count?: number; lastActiveAt?: Date } } | null;

  let nextCount = 1;
  const last = doc?.streak?.lastActiveAt
    ? new Date(doc.streak.lastActiveAt)
    : undefined;
  if (last) {
    const lastDay = new Date(
      last.getFullYear(),
      last.getMonth(),
      last.getDate()
    );
    if (lastDay.getTime() === today.getTime()) {
      nextCount = doc?.streak?.count ?? 1; // already counted today
    } else if (lastDay.getTime() === yesterday.getTime()) {
      nextCount = Math.max(1, (doc?.streak?.count ?? 0) + 1);
    } else {
      nextCount = 1;
    }
  }

  await (
    await U
  ).updateOne(
    { authUserId },
    { $set: { 'streak.count': nextCount, 'streak.lastActiveAt': now } },
    { upsert: true }
  );

  // Award badges (idempotent)
  if (nextCount >= 3) await grantBadgeBySlug(authUserId, 'streak-3');
  if (nextCount >= 7) await grantBadgeBySlug(authUserId, 'streak-7');

  return { count: nextCount, lastActiveAt: now };
}
