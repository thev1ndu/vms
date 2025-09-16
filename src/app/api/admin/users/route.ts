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
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const search = url.searchParams.get('search') || '';
  const statusFilter = url.searchParams.get('status') || '';

  const authUsersColl = await getAuthUsersCollection();

  // Build query with search functionality
  const query: Record<string, any> = {};

  if (statusFilter && statusFilter !== 'all') {
    query.status = statusFilter;
  }

  // Get all users first for search filtering
  const allRaw = await authUsersColl
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();

  const normalized = allRaw.map(normalizeAuthUser).filter((u) => !!u.id);

  // Join with app DB users to pull volunteerId/xp/level/displayName
  const ids = normalized.map((u) => u.id);
  const appUsers = await (await User)
    .find(
      { authUserId: { $in: ids } },
      { authUserId: 1, volunteerId: 1, xp: 1, level: 1, displayName: 1 }
    )
    .lean();

  const byId = new Map(appUsers.map((u: any) => [u.authUserId, u]));

  let users = normalized.map((au) => {
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

  // Apply search filter
  if (search) {
    const searchLower = search.toLowerCase();
    users = users.filter(
      (user) =>
        user.email.toLowerCase().includes(searchLower) ||
        user.name.toLowerCase().includes(searchLower) ||
        (user.displayName &&
          user.displayName.toLowerCase().includes(searchLower)) ||
        (user.volunteerId &&
          user.volunteerId.toLowerCase().includes(searchLower))
    );
  }

  // Apply pagination
  const total = users.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedUsers = users.slice(startIndex, endIndex);

  return Response.json({
    users: paginatedUsers,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
}
