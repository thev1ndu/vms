import { requireAdmin } from '@/lib/guards';
import { z } from 'zod';
import Task from '@/models/Task';
import Participation from '@/models/Participation';
import User from '@/models/User';
import { levelForXP } from '@/lib/level';
import { grantBadgeBySlug } from '@/lib/badges';

// Ensure Node runtime for Mongoose
export const runtime = 'nodejs';

const Body = z.object({ authUserId: z.string() });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin(req);
  if (!gate.ok) {
    return Response.json({ error: gate.error }, { status: gate.status });
  }

  const { authUserId } = Body.parse(await req.json());
  const { id: taskId } = await params;

  // Load only required fields
  const T = await Task;
  const task = await (await T)
    .findById(taskId, { xpReward: 1, badgeId: 1 })
    .lean<{ _id: any; xpReward?: number; badgeId?: any } | null>();
  if (!task) {
    return Response.json({ error: 'Task not found' }, { status: 404 });
  }

  // Flip participation -> completed only if currently accepted
  const P = await Participation;
  const upd = await (
    await P
  ).findOneAndUpdate(
    { taskId: String(task._id), authUserId, status: 'accepted' },
    {
      $set: { status: 'completed', completedAt: new Date() },
      $inc: { xpEarned: task.xpReward || 0 },
      ...(task.badgeId ? { $addToSet: { badgesEarned: task.badgeId } } : {}),
    },
    { new: true }
  );

  if (!upd) {
    // already completed or not accepted
    return Response.json({
      ok: true,
      message: 'No-op (already completed or not accepted)',
    });
  }

  // Award XP (+ task badge if any) to user profile
  const U = await User;
  const user = await (
    await U
  ).findOneAndUpdate(
    { authUserId },
    {
      $inc: { xp: task.xpReward || 0 },
      ...(task.badgeId ? { $addToSet: { badges: task.badgeId } } : {}),
    },
    { new: true, upsert: true, projection: { xp: 1, level: 1 } }
  );

  // Recalculate level after XP change
  const totalXP = user?.xp ?? 0;
  const prevLevel = user?.level ?? 1;
  const newLevel = levelForXP(totalXP);

  // Always update the level to ensure it's correct
  await (await U).updateOne({ authUserId }, { $set: { level: newLevel } });

  // Grant level milestone badges if level increased
  if (newLevel !== prevLevel) {
    if (newLevel >= 5) await grantBadgeBySlug(authUserId, 'level-5');
    if (newLevel >= 10) await grantBadgeBySlug(authUserId, 'level-10');
  }

  // Grant XP milestone badges
  if (totalXP >= 1000) await grantBadgeBySlug(authUserId, 'xp-1000');
  if (totalXP >= 5000) await grantBadgeBySlug(authUserId, 'xp-5000');
  if (totalXP >= 10000) await grantBadgeBySlug(authUserId, 'xp-10000');

  return Response.json({
    ok: true,
    completed: true,
    xpAwarded: task.xpReward || 0,
    level: newLevel,
    totalXP,
  });
}
