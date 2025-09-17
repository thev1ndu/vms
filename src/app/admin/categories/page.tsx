import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import CategoriesClient from './ui/CategoriesClient';

export default async function CategoriesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/');
  const role = (session.user as any).role || 'volunteer';
  const status = (session.user as any).status || 'pending';
  if (status !== 'approved' || role !== 'admin') redirect('/');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Manage Categories</h1>
        <p className="text-muted-foreground">
          Create and manage task categories for organizing volunteer activities
        </p>
      </div>

      <CategoriesClient />
    </div>
  );
}
