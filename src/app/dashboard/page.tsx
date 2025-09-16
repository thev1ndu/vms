import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import User from '@/models/User';
import VolunteerCard from '@/components/VolunteerCard';
import Header from '@/components/Header';
import Menu from '@/components/Menu';
import RSSIcon from '@/components/RSSIcon';

export default async function Dashboard() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/');
  const status = (session.user as any).status || 'pending';
  if (status !== 'approved') redirect('/pending');

  // Ensure a User doc exists
  await (
    await User
  ).updateOne(
    { authUserId: session.user.id },
    {
      $setOnInsert: {
        authUserId: session.user.id,
        displayName: session.user.name ?? session.user.email ?? 'Volunteer',
        email: session.user.email,
        xp: 0,
        level: 1,
        badges: [],
      },
    },
    { upsert: true }
  );

  return (
    <div className="grid gap-6">
      <RSSIcon />
      <Header />
      <VolunteerCard />
      <Menu />
    </div>
  );
}
