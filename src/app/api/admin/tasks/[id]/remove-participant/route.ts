import { requireAdmin } from '@/lib/guards';
import { z } from 'zod';
import Participation from '@/models/Participation';
import User from '@/models/User';
import Task from '@/models/Task';
import { levelForXP } from '@/lib/level';

const Body = z.object({ authUserId: z.string() });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin(req);
  if (!gate.ok)
    return Response.json({ error: gate.error }, { status: gate.status });

  const { id: taskId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Bad JSON' }, { status: 400 });
  }

  const parsed = Body.safeParse(body);
  if (!parsed.success)
    return Response.json({ error: 'Invalid body' }, { status: 400 });

  const { authUserId } = parsed.data;

  // Find the participation record
  const participation = (await Participation.findOne({
    taskId,
    authUserId,
  }).lean()) as any;

  if (!participation) {
    return Response.json({ error: 'Participation not found' }, { status: 404 });
  }

  // Find the task to get XP and badge info
  const task = (await Task.findById(taskId).lean()) as any;
  if (!task) {
    return Response.json({ error: 'Task not found' }, { status: 404 });
  }

  // Find the user
  const user = await User.findOne({ authUserId });
  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  // If the user was completed, we need to revoke their rewards
  if (participation.status === 'completed') {
    // Revoke XP
    const xpToRevoke = participation.xpEarned || task.xpReward || 0;
    const newXP = Math.max(0, (user.xp || 0) - xpToRevoke);
    const newLevel = levelForXP(newXP);

    user.xp = newXP;
    user.level = newLevel;

    // Revoke badges earned from this task
    if (participation.badgesEarned && participation.badgesEarned.length > 0) {
      const badgesToRemove = participation.badgesEarned.map((id: any) =>
        String(id)
      );
      user.badges = (user.badges || []).filter(
        (badgeId: any) => !badgesToRemove.includes(String(badgeId))
      );
    }

    await user.save();
  }

  // Remove the participation record
  await Participation.deleteOne({
    taskId,
    authUserId,
  });

  // Remove the user from the task's volunteersAssigned array to decrease capacity
  await Task.updateOne(
    { _id: taskId },
    { $pull: { volunteersAssigned: authUserId } }
  );

  return Response.json({
    success: true,
    message: 'Participant removed successfully',
    revokedXP:
      participation.status === 'completed'
        ? participation.xpEarned || task.xpReward || 0
        : 0,
    revokedBadges:
      participation.status === 'completed'
        ? participation.badgesEarned?.length || 0
        : 0,
  });
}
