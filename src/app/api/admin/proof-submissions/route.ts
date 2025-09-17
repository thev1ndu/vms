import { z } from 'zod';
import { requireAdmin } from '@/lib/guards';
import ProofSubmission from '@/models/ProofSubmission';
import Task from '@/models/Task';
import User from '@/models/User';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok) {
    return Response.json({ error: gate.error }, { status: gate.status });
  }

  try {
    // Get all pending proof submissions with task and user details
    const submissions = await ProofSubmission.find({ status: 'pending' })
      .populate('taskId', 'title xpReward badgeId')
      .populate('authUserId', 'displayName email')
      .sort({ createdAt: -1 })
      .lean();

    return Response.json({ submissions });
  } catch (error) {
    console.error('Error fetching proof submissions:', error);
    return Response.json(
      { error: 'Failed to fetch proof submissions' },
      { status: 500 }
    );
  }
}
