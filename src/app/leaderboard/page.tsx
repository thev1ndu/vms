import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import LeaderboardClient from './ui/LeaderboardClient';
import Header from '@/components/Header';

export default async function LeaderboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/');
  const status = (session.user as any).status || 'pending';
  if (status !== 'approved') redirect('/pending');

  return (
    <>
      <Header />
      <h2 className="text-4xl j font-bold text-center text-[#A5D8FF] mb-8">
        LEADERBOARD
      </h2>
      <LeaderboardClient />
    </>
  );
}
