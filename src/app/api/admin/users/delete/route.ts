import { requireAdmin } from '@/lib/guards';
import { authDb } from '@/lib/auth';
import User from '@/models/User';
import Participation from '@/models/Participation';
import Connection from '@/models/Connection';
import Task from '@/models/Task';
import { z } from 'zod';

const Body = z.object({
  authUserId: z.string(),
  email: z.string().optional(),
});

type AnyUserDoc = {
  _id?: any;
  id?: string;
  email?: string;
  name?: string;
  status?: string;
  role?: string;
  createdAt?: Date | string | number;
  emails?: { email: string }[];
  profile?: { name?: string };
};

async function getAuthUsersCollection() {
  const cols = await authDb.listCollections().toArray();
  const names = cols.map((c) => c.name);
  const collName = names.includes('users')
    ? 'users'
    : names.includes('user')
    ? 'user'
    : null;
  if (!collName) {
    throw new Error(
      `Auth users collection not found. Available: ${names.join(', ')}`
    );
  }
  return authDb.collection<AnyUserDoc>(collName);
}

function maybeObjectId(s: string) {
  try {
    const mongoose = require('mongoose');
    return new mongoose.Types.ObjectId(s);
  } catch {
    return null;
  }
}

function buildMatch(authUserId: string, email?: string) {
  const or: any[] = [{ id: authUserId }, { userId: authUserId }];
  const oid = maybeObjectId(authUserId);
  if (oid) or.push({ _id: oid });
  if (email) or.push({ email });
  return { $or: or };
}

export async function DELETE(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok)
    return Response.json({ error: gate.error }, { status: gate.status });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid request body', details: parsed.error },
      { status: 400 }
    );
  }

  const { authUserId, email } = parsed.data;

  try {
    // 1. Verify the user exists in auth database
    const usersColl = await getAuthUsersCollection();
    const match = buildMatch(authUserId, email);
    const authUser = await usersColl.findOne(match);

    if (!authUser) {
      return Response.json({ error: 'Auth user not found' }, { status: 404 });
    }

    // 2. Delete from auth database
    await usersColl.deleteOne(match);

    // 3. Delete from app database and all related data
    const user = await User.findOne({ authUserId });
    if (user) {
      // Delete user's participations
      await Participation.deleteMany({ authUserId });

      // Delete user's connections
      await Connection.deleteMany({
        $or: [{ a: authUserId }, { b: authUserId }],
      });

      // Remove user from tasks' volunteersAssigned arrays
      await Task.updateMany(
        { volunteersAssigned: authUserId },
        { $pull: { volunteersAssigned: authUserId } }
      );

      // Finally, delete the user record
      await User.deleteOne({ authUserId });
    }

    return Response.json({
      success: true,
      message: `User ${authUserId} and all related data deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return Response.json(
      { error: 'Failed to delete user', details: String(error) },
      { status: 500 }
    );
  }
}
