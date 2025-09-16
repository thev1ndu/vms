import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import MyTasksClient from './ui/MyTasksClient';
import Header from '@/components/Header';

export default async function MyTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/');
  const status = (session.user as any).status || 'pending';
  if (status !== 'approved') redirect('/pending');

  const resolvedSearchParams = await searchParams;
  const defaultTab = resolvedSearchParams.tab || 'applied';

  return (
    <>
      <Header />
      <h1 className="text-4xl j font-bold text-center text-[#A5D8FF] mb-8">
        OBJECTIVES
      </h1>
      <MyTasksClient defaultTab={defaultTab} />
    </>
  );
}
