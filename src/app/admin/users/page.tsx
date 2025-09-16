import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import AdminUsersClient from './ui/AdminUsersClient';
import Header from '@/components/Header';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BarChart3 } from 'lucide-react';

export default async function AdminUsersPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/');
  const role = (session.user as any).role || 'volunteer';
  const status = (session.user as any).status || 'pending';
  if (status !== 'approved' || role !== 'admin') redirect('/');
  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-4xl j font-bold text-[#A5D8FF]">SYSTEM USERS</h2>
          <Link href="/admin/statistics">
            <Button className="rounded-none bg-[#A5D8FF] text-black hover:bg-[#A5D8FF] flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              View Statistics
            </Button>
          </Link>
        </div>
        <AdminUsersClient />
      </div>
    </>
  );
}
