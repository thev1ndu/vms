import { authDb } from '@/lib/auth';
import User from '@/models/User';
import { requireAdmin } from '@/lib/guards';
import { z } from 'zod';
import { nextSequence, formatVolunteerId } from '@/models/seq';
import { ObjectId } from 'mongodb';

const Body = z.object({
  authUserId: z.string(),
  status: z.enum(['approved', 'suspended']),
  email: z.string().email().optional(), // <-- allow email fallback
});

type AnyUserDoc = { _id?: any; id?: string; userId?: string; email?: string };

async function getAuthUsersCollection() {
  const cols = await authDb.listCollections().toArray();
  const names = cols.map((c) => c.name);
  const coll = names.includes('users')
    ? 'users'
    : names.includes('user')
    ? 'user'
    : null;
  if (!coll)
    throw new Error(
      `Auth users collection not found. Seen: ${names.join(', ')}`
    );
  return authDb.collection<AnyUserDoc>(coll);
}

function maybeObjectId(s: string) {
  try {
    return new ObjectId(s);
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

export async function POST(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok)
    return Response.json({ error: gate.error }, { status: gate.status });

  const { authUserId, status, email } = Body.parse(await req.json());

  const usersColl = await getAuthUsersCollection();

  // 1) Update auth user's status (robust match)
  const match = buildMatch(authUserId, email);
  const res = await usersColl.updateOne(match, { $set: { status } });

  if (!res.matchedCount) {
    return Response.json(
      {
        error: 'Auth user not found (checked id/_id/userId/email)',
        tried: { authUserId, email },
      },
      { status: 404 }
    );
  }

  // 2) If approved: ensure app user exists and has volunteerId
  if (status === 'approved') {
    const appUser = await (await User).findOne({ authUserId });
    if (!appUser) {
      await (await User).create({ authUserId, xp: 0, level: 1, badges: [] });
    }
    const doc = await (await User).findOne({ authUserId });
    if (doc && !doc.volunteerId) {
      const n = await nextSequence('volunteerId');
      doc.volunteerNo = n;
      doc.volunteerId = formatVolunteerId(n);
      await doc.save();
    }
  }

  return Response.json({ ok: true });
}
