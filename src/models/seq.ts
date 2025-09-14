import { Counter } from './Counter';

export async function nextSequence(key: string): Promise<number> {
  const C = await Counter();
  const doc = await C.findOneAndUpdate(
    { key },
    { $inc: { value: 1 } },
    { upsert: true, new: true }
  );
  return doc.value as number;
}

export function formatVolunteerId(n: number) {
  return `#${String(n).padStart(5, '0')}`;
}
