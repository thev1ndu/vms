import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import VolunteerCard from '@/components/VolunteerCard';
import Header from '@/components/Header';
import ProfileClient from './ui/ProfileClient';

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/');
  const status = (session.user as any).status || 'pending';
  if (status !== 'approved') redirect('/pending');

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-8">
          <h2 className="text-4xl font-bold text-center text-[#A5D8FF] mb-8">
            PROFILE
          </h2>
          <VolunteerCard />
          <div className="mt-6">
            <ProfileClient />
          </div>
        </div>
      </div>
    </>
  );
}
