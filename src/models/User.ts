import { Schema, model, models } from 'mongoose';
import { dbConnect } from '@/lib/db';

export interface IUser {
  authUserId: string;
  displayName?: string;
  email?: string;

  // Gamification
  xp: number;
  level: number; // 1..10
  badges: Schema.Types.ObjectId[];

  // Volunteer profile
  volunteer?: {
    alias?: string;
    bio?: string;
    avatarUrl?: string;
  };

  // Volunteer numbering
  volunteerId?: string; // "#00001"

  // Streaks
  streak?: {
    count?: number; // consecutive active days
    lastActiveAt?: Date;
  };

  // Category preferences for task recommendations
  categoryPreferences?: string[]; // Array of category names

  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    authUserId: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true, index: true },

    xp: { type: Number, default: 0, min: 0, index: true },
    level: { type: Number, default: 1, min: 1, max: 10, index: true },
    badges: [{ type: Schema.Types.ObjectId, ref: 'Badge' }],

    volunteer: {
      alias: { type: String, trim: true },
      bio: { type: String, trim: true, maxlength: 1000 },
      avatarUrl: { type: String, trim: true },
    },

    volunteerId: { type: String, unique: true, sparse: true, index: true },

    streak: {
      count: { type: Number, default: 0, min: 0 },
      lastActiveAt: { type: Date },
    } as any,

    categoryPreferences: [{ type: String, trim: true }],
  },
  { timestamps: true, versionKey: false }
);

// Indexes
UserSchema.index({ level: -1, xp: -1 }); // leaderboard
UserSchema.index({ createdAt: -1 });
UserSchema.index({ 'streak.lastActiveAt': -1 });

export default (await dbConnect(), models.User as any) ||
  model<IUser>('User', UserSchema);
