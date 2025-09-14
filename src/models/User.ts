import { Schema, model, models } from 'mongoose';
import { dbConnect } from '@/lib/db';

const CHAT_TAG_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{1,14}[A-Za-z0-9]$/;

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
  volunteerNo?: number; // 1,2,3...
  volunteerId?: string; // "#00001"

  // Admin-defined chat handle
  chatTag?: string;
  chatTagLower?: string;

  // Preferences
  preferences?: {
    allowScanning?: boolean;
  };

  // Streaks
  streak?: {
    count?: number; // consecutive active days
    lastActiveAt?: Date;
  };

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

    volunteerNo: { type: Number, unique: true, sparse: true, index: true },
    volunteerId: { type: String, unique: true, sparse: true, index: true },

    chatTag: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      minlength: 3,
      maxlength: 16,
      validate: {
        validator: (v: string) => !v || CHAT_TAG_RE.test(v),
        message: 'Invalid chat tag',
      },
    },
    chatTagLower: { type: String, unique: true, sparse: true, index: true },

    preferences: {
      allowScanning: { type: Boolean, default: true },
    },

    streak: {
      count: { type: Number, default: 0, min: 0 },
      lastActiveAt: { type: Date },
    } as any,
  },
  { timestamps: true, versionKey: false }
);

// Convert chat tag to lowercase and create shadow for case-insensitive unique chatTag
UserSchema.pre('save', function (next) {
  if (this.isModified('chatTag')) {
    if (this.chatTag) {
      // @ts-ignore
      this.chatTag = this.chatTag.toLowerCase();
      // @ts-ignore
      this.chatTagLower = this.chatTag;
    } else {
      // @ts-ignore
      this.chatTagLower = undefined;
    }
  }
  next();
});

// Indexes
UserSchema.index({ level: -1, xp: -1 }); // leaderboard
UserSchema.index({ createdAt: -1 });
UserSchema.index({ 'streak.lastActiveAt': -1 });

export default (await dbConnect(), models.User as any) ||
  model<IUser>('User', UserSchema);
