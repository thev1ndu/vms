import { Schema, model, models } from 'mongoose';
import { dbConnect } from '@/lib/db';

export interface IAchievement {
  key: string; // unique code, e.g., "first-connection"
  name: string;
  description?: string;
  icon?: string;
  xpReward: number;
  badgeId?: Schema.Types.ObjectId; // -> Badge
  rule?: any; // JSON rule definition (optional)
  createdAt: Date;
  updatedAt: Date;
}

const AchievementSchema = new Schema<IAchievement>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    icon: { type: String, trim: true },
    xpReward: { type: Number, required: true, min: 0 },
    badgeId: { type: Schema.Types.ObjectId, ref: 'Badge' },
    rule: { type: Schema.Types.Mixed },
  },
  { timestamps: true, versionKey: false }
);

export default (await dbConnect(), models.Achievement) ||
  model<IAchievement>('Achievement', AchievementSchema);
