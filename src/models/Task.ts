import { Schema, model, models } from 'mongoose';
import { dbConnect } from '@/lib/db';
import { type TaskMode, type TaskStatus } from './constants';

export interface ITask {
  title: string;
  description: string;
  mode: TaskMode; // "on-site" | "off-site"
  category: string; // Category name or ID
  levelRequirement: number; // min volunteer level
  volunteersRequired: number;
  volunteersAssigned: string[]; // authUserId[]
  xpReward: number;
  badgeId?: Schema.Types.ObjectId; // -> Badge
  qrData?: string; // JSON string for on-site
  qrImageDataUrl?: string; // Data URL PNG
  status: TaskStatus; // "draft"|"open"|"closed"
  startsAt?: Date;
  endsAt?: Date;
  createdBy: string; // authUserId of the creator
  createdByEmail: string; // email of the creator
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true, minlength: 3 },
    description: { type: String, required: true, trim: true, minlength: 3 },
    mode: {
      type: String,
      enum: ['on-site', 'off-site'],
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    levelRequirement: { type: Number, default: 1, min: 1, index: true },
    volunteersRequired: { type: Number, default: 1, min: 1 },
    volunteersAssigned: [{ type: String }], // authUserId
    xpReward: { type: Number, default: 10, min: 1 },
    badgeId: { type: Schema.Types.ObjectId, ref: 'Badge' },
    qrData: { type: String }, // on-site
    qrImageDataUrl: { type: String }, // on-site
    status: {
      type: String,
      enum: ['draft', 'open', 'closed'],
      default: 'open',
      index: true,
    },
    startsAt: { type: Date, index: true },
    endsAt: { type: Date, index: true },
    createdBy: { type: String, required: true, index: true }, // authUserId
    createdByEmail: { type: String, required: true, index: true }, // email
  },
  { timestamps: true, versionKey: false }
);

TaskSchema.index({
  mode: 1,
  category: 1,
  status: 1,
  levelRequirement: 1,
  startsAt: 1,
});

export default (await dbConnect(), models.Task) ||
  model<ITask>('Task', TaskSchema);
