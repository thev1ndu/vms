import { Schema, model, models } from 'mongoose';
import { dbConnect } from '@/lib/db';

export type ProofStatus = 'pending' | 'approved' | 'rejected';

export interface IProofSubmission {
  taskId: string; // Task _id (string)
  authUserId: string; // User auth ID
  proof: string; // User's proof description
  status: ProofStatus;
  reviewedBy?: string; // Admin auth ID who reviewed
  reviewedAt?: Date;
  rejectionReason?: string; // If rejected, why
  createdAt: Date;
  updatedAt: Date;
}

const ProofSubmissionSchema = new Schema<IProofSubmission>(
  {
    taskId: { type: String, required: true, index: true },
    authUserId: { type: String, required: true, index: true },
    proof: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
    rejectionReason: { type: String },
  },
  { timestamps: true, versionKey: false }
);

// One pending proof submission per (user, task)
ProofSubmissionSchema.index(
  { taskId: 1, authUserId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'pending' },
  }
);

export default (await dbConnect(), models.ProofSubmission) ||
  model<IProofSubmission>('ProofSubmission', ProofSubmissionSchema);
