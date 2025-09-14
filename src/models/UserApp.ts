import { Schema, model, models } from 'mongoose';
import { dbConnect } from '@/lib/db';
import { nextSequence, formatVolunteerId } from './seq';

const CHAT_TAG_RE = /^[A-Za-z0-9][A-Za-z0-9 ._-]{1,30}[A-Za-z0-9]$/;

const UserAppSchema = new Schema(
  {
    authUserId: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true, index: true },
    role: {
      type: String,
      enum: ['admin', 'volunteer'],
      default: 'volunteer',
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },

    xp: { type: Number, default: 0, min: 0, index: true },
    level: { type: Number, default: 1, min: 1, max: 10, index: true },
    badges: [{ type: Schema.Types.ObjectId, ref: 'Badge' }],

    agent: {
      alias: { type: String },
      bio: { type: String, maxlength: 1000 },
      avatarUrl: { type: String },
    },

    volunteerNo: { type: Number, unique: true, sparse: true, index: true },
    volunteerId: { type: String, unique: true, sparse: true, index: true },

    // Admin-defined chat handle
    chatTag: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      minlength: 3,
      maxlength: 32,
      validate: {
        validator: (v: string) => !v || CHAT_TAG_RE.test(v),
        message: 'Invalid chat tag',
      },
    },
    // Shadow for case-insensitive uniqueness
    chatTagLower: { type: String, unique: true, sparse: true, index: true },
  },
  { timestamps: true, versionKey: false }
);

UserAppSchema.pre('save', async function () {
  // assign volunteerId when approved first time
  if (
    this.isModified('status') &&
    this.status === 'approved' &&
    !this.volunteerNo
  ) {
    const n = await nextSequence('volunteerId');
    this.volunteerNo = n;
    this.volunteerId = formatVolunteerId(n);
  }
  // sync chatTagLower
  if (this.isModified('chatTag')) {
    this.chatTagLower = this.chatTag ? this.chatTag.toLowerCase() : undefined;
  }
});

UserAppSchema.index({ level: -1, xp: -1 });
UserAppSchema.index({ status: 1, createdAt: -1 });

export default (await dbConnect(), models.UserApp) ||
  model('UserApp', UserAppSchema);
