import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import TaskTable from './ui/TaskTable';
import Header from '@/components/Header';

export default async function AdminTasksPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect('/');
  const role = (session.user as any).role || 'volunteer';
  const status = (session.user as any).status || 'pending';
  if (status !== 'approved' || role !== 'admin') redirect('/');

  return (
    <div className="grid gap-6">
      <Header />
      <div className="flex items-center justify-between">
        <h1 className="text-4xl j font-bold text-center text-[#A5D8FF]">
          MANAGE TASKS
        </h1>
        <a
          href="/admin/tasks/create"
          className="px-4 py-2 bg-[#A5D8FF] text-black rounded-none hover:bg-[#A5D8FF] transition-colors cursor-pointer"
        >
          Create Task
        </a>
      </div>
      <TaskTable />
    </div>
  );
}
