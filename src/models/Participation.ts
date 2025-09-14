import { Schema, model, models } from 'mongoose';
import { dbConnect } from '@/lib/db';
import type { TaskMode } from './constants';

export type ParticipationStatus = 'applied' | 'accepted' | 'completed';

export interface IParticipation {
  taskId: string; // Task _id (string)
  authUserId: string; // User auth ID
  mode: TaskMode; // mirror Task.mode for fast filtering
  status: ParticipationStatus;
  xpEarned: number;
  badgesEarned: Schema.Types.ObjectId[]; // -> Badge[]
  completedAt?: Date;
  proof?: string; // User's proof of completion
  createdAt: Date;
  updatedAt: Date;
}

const ParticipationSchema = new Schema<IParticipation>(
  {
    taskId: { type: String, required: true, index: true },
    authUserId: { type: String, required: true, index: true },
    mode: { type: String, enum: ['on-site', 'off-site'], required: true },
    status: {
      type: String,
      enum: ['applied', 'accepted', 'completed'],
      default: 'applied',
      index: true,
    },
    xpEarned: { type: Number, default: 0, min: 0 },
    badgesEarned: [{ type: Schema.Types.ObjectId, ref: 'Badge' }],
    completedAt: { type: Date },
    proof: { type: String },
  },
  { timestamps: true, versionKey: false }
);

// One record per (user, task)
ParticipationSchema.index({ taskId: 1, authUserId: 1 }, { unique: true });

export default (await dbConnect(), models.Participation) ||
  model<IParticipation>('Participation', ParticipationSchema);
