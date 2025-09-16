import { z } from 'zod';
import { requireAdmin } from '@/lib/guards';
import Task from '@/models/Task';
import Participation from '@/models/Participation';
import User from '@/models/User';
import Badge from '@/models/Badge';
import { levelForXP } from '@/lib/level';
import { grantBadgeBySlug } from '@/lib/badges';

type TaskDoc = {
  _id: any;
  xpReward?: number;
  badgeId?: string;
};

type ParticipationDoc = {
  _id: any;
  status?: string;
};

type UserDoc = {
  _id: any;
  xp?: number;
  level?: number;
  badges?: any[];
};

const Body = z.object({ taskId: z.string(), authUserId: z.string() });

export async function POST(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok)
    return Response.json({ error: gate.error }, { status: gate.status });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Bad JSON' }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success)
    return Response.json({ error: 'Invalid body' }, { status: 400 });

  const { taskId, authUserId } = parsed.data;
  const task = await Task.findById(taskId).lean<TaskDoc>().exec();
  if (!task) return Response.json({ error: 'Task not found' }, { status: 404 });

  const part = await Participation.findOne({
    taskId: String(task._id),
    authUserId,
  })
    .lean<ParticipationDoc>()
    .exec();
  if (!part)
    return Response.json({ error: 'Participation not found' }, { status: 404 });
  if (part.status === 'completed')
    return Response.json({ ok: true, message: 'Already completed' });
  if (part.status !== 'accepted')
    return Response.json(
      { error: 'Only accepted participants can be completed' },
      { status: 400 }
    );

  // Award XP
  const xpGain = task.xpReward ?? 0;
  const user = await User.findOne({ authUserId });
  if (!user) return Response.json({ error: 'User not found' }, { status: 404 });
  const nextXP = (user.xp ?? 0) + xpGain;
  const prevLevel = user.level ?? 1;
  const newLevel = levelForXP(nextXP);

  user.xp = nextXP;
  user.level = newLevel;

  // Optional badge
  const badges: any[] = [];
  if (task.badgeId) {
    const exists = (user.badges || []).some(
      (b: any) => String(b) === String(task.badgeId)
    );
    if (!exists) user.badges = [...(user.badges || []), task.badgeId as any];
    badges.push(task.badgeId);
  }
  await user.save();

  // Grant level milestone badges if level increased
  if (newLevel !== prevLevel) {
    if (newLevel >= 5) await grantBadgeBySlug(authUserId, 'level-5');
    if (newLevel >= 10) await grantBadgeBySlug(authUserId, 'level-10');
  }

  // Grant XP milestone badges
  if (nextXP >= 1000) await grantBadgeBySlug(authUserId, 'xp-1000');
  if (nextXP >= 5000) await grantBadgeBySlug(authUserId, 'xp-5000');
  if (nextXP >= 10000) await grantBadgeBySlug(authUserId, 'xp-10000');

  await Participation.updateOne(
    { taskId: String(task._id), authUserId },
    {
      $set: {
        status: 'completed',
        completedAt: new Date(),
        xpEarned: xpGain,
        badgesEarned: badges,
      },
    }
  );

  return Response.json({ ok: true, xpAwarded: xpGain, level: user.level });
}
