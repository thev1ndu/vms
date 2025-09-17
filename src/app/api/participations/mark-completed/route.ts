import { z } from 'zod';
import { requireApproved } from '@/lib/guards';
import Task from '@/models/Task';
import Participation from '@/models/Participation';
import User from '@/models/User';
import Badge from '@/models/Badge';
import ProofSubmission from '@/models/ProofSubmission';
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

const Body = z.object({
  taskId: z.string(),
  proof: z.string().min(1, 'Proof is required'),
});

export async function POST(req: Request) {
  const gate = await requireApproved(req);
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

  const authUserId = String(gate.session!.user.id);
  const { taskId, proof } = parsed.data;

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
      { error: 'Only accepted participants can mark as completed' },
      { status: 400 }
    );

  // Check if there's already a pending proof submission for this task
  const existingProof = await ProofSubmission.findOne({
    taskId: String(task._id),
    authUserId,
    status: 'pending',
  });

  if (existingProof) {
    return Response.json(
      {
        error: 'You already have a pending proof submission for this task',
      },
      { status: 400 }
    );
  }

  // Create a new proof submission
  const proofSubmission = await ProofSubmission.create({
    taskId: String(task._id),
    authUserId,
    proof,
    status: 'pending',
  });

  // Update participation to store proof but don't mark as completed yet
  await Participation.updateOne(
    { taskId: String(task._id), authUserId },
    {
      $set: {
        proof: proof,
      },
    }
  );

  return Response.json({
    ok: true,
    message:
      'Proof submitted successfully. Your submission is pending admin approval.',
    proofSubmissionId: proofSubmission._id,
  });
}
