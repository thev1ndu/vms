import { Schema, model, models } from 'mongoose';
import { dbConnect } from '@/lib/db';

export interface IBadge {
  name: string;
  slug: string; // unique code, e.g., "first-connection"
  description?: string;
  icon?: string; // emoji or URL
  createdAt: Date;
  updatedAt: Date;
}

const BadgeSchema = new Schema<IBadge>(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: { type: String, trim: true, maxlength: 500 },
    icon: { type: String, trim: true },
  },
  { timestamps: true, versionKey: false }
);

export default (await dbConnect(), models.Badge) ||
  model<IBadge>('Badge', BadgeSchema);
