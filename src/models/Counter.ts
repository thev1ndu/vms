import { Schema, model, models } from 'mongoose';
import { dbConnect } from '@/lib/db';

const CounterSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Number, required: true, default: 0 },
  },
  { versionKey: false }
);

export async function Counter() {
  await dbConnect();
  return models.Counter || model('Counter', CounterSchema);
}
