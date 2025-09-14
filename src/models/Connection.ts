import { Schema, model, models } from 'mongoose';
import { dbConnect } from '@/lib/db';

export interface IConnection {
  a: string; // smaller of the two authUserIds (lexicographic)
  b: string; // larger
  createdBy: string; // who scanned
  createdAt: Date;
  updatedAt: Date;
}

const ConnectionSchema = new Schema<IConnection>(
  {
    a: { type: String, required: true, index: true },
    b: { type: String, required: true, index: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true, versionKey: false }
);

ConnectionSchema.index({ a: 1, b: 1 }, { unique: true }); // enforce single reward per pair

export default (await dbConnect(), models.Connection) ||
  model<IConnection>('Connection', ConnectionSchema);
