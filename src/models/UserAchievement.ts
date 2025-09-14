import { Schema, model, models } from 'mongoose';
import { dbConnect } from '@/lib/db';

export interface IUserAchievement {
  authUserId: string;
  achievementId: Schema.Types.ObjectId;
  unlockedAt: Date;
  meta?: any; // optional details
  createdAt: Date;
  updatedAt: Date;
}

const UserAchievementSchema = new Schema<IUserAchievement>(
  {
    authUserId: { type: String, required: true, index: true },
    achievementId: {
      type: Schema.Types.ObjectId,
      ref: 'Achievement',
      required: true,
      index: true,
    },
    unlockedAt: { type: Date, default: () => new Date() },
    meta: Schema.Types.Mixed,
  },
  { timestamps: true, versionKey: false }
);

// prevent duplicates
UserAchievementSchema.index(
  { authUserId: 1, achievementId: 1 },
  { unique: true }
);

export default (await dbConnect(), models.UserAchievement) ||
  model<IUserAchievement>('UserAchievement', UserAchievementSchema);
