import { z } from 'zod';
import { requireAdmin } from '@/lib/guards';
import ProofSubmission from '@/models/ProofSubmission';
import Task from '@/models/Task';
import Participation from '@/models/Participation';
import User from '@/models/User';
import { levelForXP } from '@/lib/level';
import { grantBadgeBySlug } from '@/lib/badges';

export const runtime = 'nodejs';

const Body = z.object({
  rejectionReason: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin(req);
  if (!gate.ok) {
    return Response.json({ error: gate.error }, { status: gate.status });
  }

  const { id: submissionId } = await params;
  const { rejectionReason } = Body.parse(await req.json());

  try {
    // Find the proof submission
    const submission = await ProofSubmission.findById(submissionId);
    if (!submission) {
      return Response.json(
        { error: 'Proof submission not found' },
        { status: 404 }
      );
    }

    if (submission.status !== 'pending') {
      return Response.json(
        { error: 'Proof submission already reviewed' },
        { status: 400 }
      );
    }

    // Get task details
    const task = await Task.findById(submission.taskId);
    if (!task) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }

    // Get user details
    const user = await User.findOne({ authUserId: submission.authUserId });
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Award XP and badges
    const xpGain = task.xpReward ?? 0;
    const nextXP = (user.xp ?? 0) + xpGain;
    const prevLevel = user.level ?? 1;
    const newLevel = levelForXP(nextXP);

    user.xp = nextXP;
    user.level = newLevel;

    // Award task badge if exists
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
      if (newLevel >= 5)
        await grantBadgeBySlug(submission.authUserId, 'level-5');
      if (newLevel >= 10)
        await grantBadgeBySlug(submission.authUserId, 'level-10');
    }

    // Grant XP milestone badges
    if (nextXP >= 1000)
      await grantBadgeBySlug(submission.authUserId, 'xp-1000');
    if (nextXP >= 5000)
      await grantBadgeBySlug(submission.authUserId, 'xp-5000');
    if (nextXP >= 10000)
      await grantBadgeBySlug(submission.authUserId, 'xp-10000');

    // Update participation to completed
    await Participation.updateOne(
      { taskId: submission.taskId, authUserId: submission.authUserId },
      {
        $set: {
          status: 'completed',
          completedAt: new Date(),
          xpEarned: xpGain,
          badgesEarned: badges,
        },
      }
    );

    // Update proof submission as approved
    submission.status = 'approved';
    submission.reviewedBy = String(gate.session!.user.id);
    submission.reviewedAt = new Date();
    await submission.save();

    // Trigger refresh events for the user
    // Note: In a real app, you might want to use WebSockets or Server-Sent Events
    // For now, the frontend will refresh when the user navigates

    return Response.json({
      ok: true,
      message: 'Proof approved and badges awarded',
      xpAwarded: xpGain,
      badgesAwarded: badges.length,
      newLevel: user.level,
    });
  } catch (error) {
    console.error('Error approving proof submission:', error);
    return Response.json(
      { error: 'Failed to approve proof submission' },
      { status: 500 }
    );
  }
}
