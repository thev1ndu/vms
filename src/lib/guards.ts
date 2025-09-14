import { auth } from '@/lib/auth';

export async function requireAdmin(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user)
    return { ok: false, status: 401, error: 'Unauthorized' as const };
  const role = (session.user as any).role || 'volunteer';
  const status = (session.user as any).status || 'pending';
  if (status !== 'approved')
    return { ok: false, status: 403, error: 'User is not approved' as const };
  if (role !== 'admin')
    return { ok: false, status: 403, error: 'Admin only' as const };
  return { ok: true, session } as const;
}

export async function requireApproved(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user)
    return { ok: false, status: 401, error: 'Unauthorized' as const };
  const status = (session.user as any).status || 'pending';
  if (status !== 'approved')
    return { ok: false, status: 403, error: 'Pending approval' as const };
  return { ok: true, session } as const;
}
