import { Schema, model, models } from 'mongoose';
import { dbConnect } from '@/lib/db';

export interface ICategory {
  name: string;
  description?: string;
  color?: string; // Hex color for UI display
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    color: {
      type: String,
      trim: true,
      match: /^#[0-9A-F]{6}$/i, // Hex color validation
      default: '#A5D8FF', // Default to the app's primary color
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true, versionKey: false }
);

// Create index for active categories
CategorySchema.index({ isActive: 1, name: 1 });

export default (await dbConnect(), models.Category) ||
  model<ICategory>('Category', CategorySchema);
