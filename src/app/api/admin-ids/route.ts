import { authDb } from '@/lib/auth';
import { requireApproved } from '@/lib/guards';

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

/**
 * GET /api/admin-ids
 * Public endpoint to get list of admin user IDs
 * This allows regular users to see who the admins are for UI purposes
 */
export async function GET(req: Request) {
  const gate = await requireApproved(req);
  if (!gate.ok)
    return Response.json({ error: gate.error }, { status: gate.status });

  try {
    const authUsersColl = await getAuthUsersCollection();

    // Get all users with admin role and approved status
    const adminUsers = await authUsersColl
      .find({ role: 'admin', status: 'approved' })
      .project({ id: 1, _id: 1 })
      .toArray();

    // Extract user IDs
    const adminIds = adminUsers
      .map((user) => user.id ?? (user._id ? String(user._id) : null))
      .filter((id): id is string => !!id);

    return Response.json({ adminIds });
  } catch (error) {
    console.error('Error fetching admin IDs:', error);
    return Response.json(
      { error: 'Failed to fetch admin IDs' },
      { status: 500 }
    );
  }
}
