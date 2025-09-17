import { z } from 'zod';
import { requireApproved } from '@/lib/guards';
import ProofSubmission from '@/models/ProofSubmission';
import Task from '@/models/Task';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const gate = await requireApproved(req);
  if (!gate.ok) {
    return Response.json({ error: gate.error }, { status: gate.status });
  }

  const authUserId = String(gate.session!.user.id);

  try {
    // Get all proof submissions for this user
    const submissions = await ProofSubmission.find({ authUserId })
      .populate('taskId', 'title xpReward badgeId')
      .sort({ createdAt: -1 })
      .lean();

    return Response.json({ submissions });
  } catch (error) {
    console.error('Error fetching user proof submissions:', error);
    return Response.json(
      { error: 'Failed to fetch proof submissions' },
      { status: 500 }
    );
  }
}
