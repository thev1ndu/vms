import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import SystemUsersDash from '@/components/SystemUsersDash';
import Header from '@/components/Header';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default async function AdminStatisticsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/');
  const role = (session.user as any).role || 'volunteer';
  const status = (session.user as any).status || 'pending';
  if (status !== 'approved' || role !== 'admin') redirect('/');

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center mb-8 relative">
          <h2 className="text-4xl j font-bold text-[#A5D8FF]">STATISTICS</h2>
        </div>
        <SystemUsersDash />
      </div>
    </>
  );
}
