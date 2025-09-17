import { z } from 'zod';
import { requireAdmin } from '@/lib/guards';
import ProofSubmission from '@/models/ProofSubmission';

export const runtime = 'nodejs';

const Body = z.object({
  rejectionReason: z.string().min(1, 'Rejection reason is required'),
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

    // Update proof submission as rejected
    submission.status = 'rejected';
    submission.reviewedBy = String(gate.session!.user.id);
    submission.reviewedAt = new Date();
    submission.rejectionReason = rejectionReason;
    await submission.save();

    return Response.json({
      ok: true,
      message: 'Proof submission rejected',
    });
  } catch (error) {
    console.error('Error rejecting proof submission:', error);
    return Response.json(
      { error: 'Failed to reject proof submission' },
      { status: 500 }
    );
  }
}
