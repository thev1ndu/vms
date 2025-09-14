import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import AdminUsersClient from './ui/AdminUsersClient';

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/');
  const role = (session.user as any).role || 'volunteer';
  const status = (session.user as any).status || 'pending';
  if (status !== 'approved' || role !== 'admin') redirect('/');
  return <AdminUsersClient />;
}
