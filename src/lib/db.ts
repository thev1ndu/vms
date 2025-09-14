import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI!;
let cached = (global as any)._mongoose as {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

if (!cached) cached = (global as any)._mongoose = { conn: null, promise: null };

export async function dbConnect() {
  if (cached.conn) return cached.conn;
  if (!cached.promise)
    cached.promise = mongoose.connect(uri, { dbName: uri.split('/').pop()! });
  cached.conn = await cached.promise;
  return cached.conn;
}
