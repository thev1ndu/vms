import { authDb } from '@/lib/auth';
import User from '@/models/User';
import { requireAdmin } from '@/lib/guards';

type AnyUserDoc = {
  _id?: any;
  id?: string;
  email?: string;
  name?: string;
  status?: string;
  role?: string;
  createdAt?: Date | string | number;
  // some adapters store arrays
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

function normalizeAuthUser(au: AnyUserDoc) {
  const id = (au.id ?? (au._id ? String(au._id) : undefined))!;
  const email = au.email ?? au.emails?.[0]?.email ?? undefined;
  const name = au.name ?? au.profile?.name ?? undefined;
  const role = au.role ?? 'volunteer';
  const status = au.status ?? 'pending';
  const createdAt =
    (au.createdAt ? new Date(au.createdAt) : undefined) ?? undefined;
  return { id, email, name, role, status, createdAt };
}

export async function GET(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok)
    return Response.json({ error: gate.error }, { status: gate.status });

  const url = new URL(req.url);
  const statusFilter = url.searchParams.get('status'); // optional: pending|approved|rejected

  const authUsersColl = await getAuthUsersCollection();

  // Build query without assuming exact field presence
  const query: Record<string, any> = {};
  if (statusFilter) query.status = statusFilter;

  const raw = await authUsersColl
    .find(query)
    // don't over-project; some fields vary by adapter version
    .sort({ createdAt: -1 }) // harmless if field missing
    .limit(500)
    .toArray();

  const normalized = raw
    .map(normalizeAuthUser)
    // sanity: require an id (skip truly malformed docs)
    .filter((u) => !!u.id);

  // Join with app DB users to pull volunteerId/xp/level/chatTag
  const ids = normalized.map((u) => u.id);
  const appUsers = await (await User)
    .find(
      { authUserId: { $in: ids } },
      { authUserId: 1, volunteerId: 1, xp: 1, level: 1, displayName: 1 }
    )
    .lean();

  const byId = new Map(appUsers.map((u: any) => [u.authUserId, u]));

  const users = normalized.map((au) => {
    const appUser = byId.get(au.id) as any;
    return {
      authUserId: au.id,
      email: au.email ?? '(no email)',
      name: au.name ?? au.email ?? 'Volunteer',
      role: au.role,
      status: au.status,
      volunteerId: appUser?.volunteerId || null,
      xp: appUser?.xp ?? 0,
      level: appUser?.level ?? 1,
      displayName: appUser?.displayName || null,
      createdAt: au.createdAt ?? null,
    };
  });

  return Response.json({ users });
}
