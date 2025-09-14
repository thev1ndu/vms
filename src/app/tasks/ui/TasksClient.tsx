'use client';
import useSWR from 'swr';
import { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import StableDialog from '@/components/StableDialog';
import '@/components/components.css';

const fetcher = (u: string) => fetch(u).then((r) => r.json());

type Task = {
  _id: string;
  title: string;
  description: string;
  mode: 'on-site' | 'off-site';
  category: string;
  levelRequirement: number;
  volunteersRequired: number;
  volunteersAssigned: string[];
  xpReward: number;
  startsAt?: string;
  endsAt?: string;
};

type Me = { me: { level: number } };

type UserTasks = {
  applied: Array<{ taskId: string; task: Task | null }>;
  accepted: Array<{ taskId: string; task: Task | null }>;
  completed: Array<{ taskId: string; task: Task | null }>;
};

function ApplyButton({
  taskId,
  onSuccess,
}: {
  taskId: string;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [appliedSuccessfully, setAppliedSuccessfully] = useState(false);

  async function handleApply() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/tasks/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      });
      const j = await res.json();
      if (!res.ok) {
        setTitle('ERROR');
        setMessage(j.error || 'Apply failed');
        setAppliedSuccessfully(false);
      } else {
        setTitle('SUCCESS');
        setMessage('Applied!');
        setAppliedSuccessfully(true);
        // Don't refresh data immediately - wait for dialog to close
      }
    } catch (error) {
      setTitle('ERROR');
      setMessage('Apply failed');
      setAppliedSuccessfully(false);
    } finally {
      setIsLoading(false);
    }
  }

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    // If dialog is being closed and application was successful, refresh data to hide the task
    if (!newOpen && appliedSuccessfully) {
      onSuccess?.();
    }
  }

  return (
    <StableDialog
      open={open}
      onOpenChange={handleOpenChange}
      trigger={
        <Button
          onClick={handleApply}
          disabled={isLoading}
          className="w-full bg-[#A5D8FF] text-black hover:bg-[#A5D8FF] rounded-none cursor-pointer text-lg"
        >
          {isLoading ? 'Apply' : 'Apply'}
        </Button>
      }
      title={title || 'APPLY TO TASK'}
      contentClassName="sm:max-w-md border-2 border-[#A5D8FF] bg-[#000000] rounded-none"
      headerClassName="p-0"
      titleClassName="mx-auto w-[90%] j bg-[#C49799] text-xl text-black text-center py-3 mb-4"
    >
      <div className="flex items-center justify-center p-4">
        <p className="text-sm text-white">{message}</p>
      </div>
    </StableDialog>
  );
}

export default function TasksClient() {
  const { data: me } = useSWR<Me>('/api/me', fetcher);
  const level = me?.me?.level ?? 1;

  const [tab, setTab] = useState<'on-site' | 'off-site'>('on-site');

  const { data, mutate } = useSWR<{ tasks: Task[] }>(
    `/api/tasks?status=open&mode=${tab}&minLevel=${level}`,
    fetcher
  );

  const { data: userTasks, mutate: mutateUserTasks } = useSWR<UserTasks>(
    '/api/me/tasks',
    fetcher
  );

  const tasks = useMemo(() => {
    const allTasks = data?.tasks ?? [];

    // Collect all task IDs that user has participated in (applied, accepted, or completed)
    const participatedTaskIds = new Set([
      ...(userTasks?.applied ?? []).map((p) => p.taskId),
      ...(userTasks?.accepted ?? []).map((p) => p.taskId),
      ...(userTasks?.completed ?? []).map((p) => p.taskId),
    ]);

    // Filter out tasks that user has already participated in
    return allTasks.filter((task) => !participatedTaskIds.has(task._id));
  }, [data, userTasks]);

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(v as any)}
      className="grid gap-4"
    >
      <TabsList className="w-max rounded-none bg-[#A5D8FF]">
        <TabsTrigger
          value="on-site"
          className="rounded-none text-base text-black data-[state=active]:text-white"
        >
          On-Site
        </TabsTrigger>
        <TabsTrigger
          value="off-site"
          className="rounded-none text-base text-black data-[state=active]:text-white"
        >
          Off-Site
        </TabsTrigger>
      </TabsList>
      <TabsContent value={tab}>
        <div className="grid gap-3">
          {tasks.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No tasks available for your level yet.
            </div>
          ) : (
            tasks.map((t) => (
              <Card
                key={t._id}
                className="bg-transparent border-2 border-[#A5D8FF] rounded-none text-white"
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{t.title}</span>
                    <span className="text-lg text-muted-white opacity-90">
                      {t.xpReward} XP
                    </span>
                  </CardTitle>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <div className="flex-1 text-left">
                      Category: <span className="capitalize">{t.category}</span>
                    </div>
                    <div className="flex-1 text-center">
                      Level: {t.levelRequirement}+
                    </div>
                    <div className="flex-1 text-right">
                      Capacity: {t.volunteersAssigned?.length || 0}/
                      {t.volunteersRequired}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm">{t.description}</div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <div>
                      Start:{' '}
                      {t.startsAt
                        ? new Date(t.startsAt).toLocaleString()
                        : 'Not set'}
                    </div>
                    <div>
                      End:{' '}
                      {t.endsAt
                        ? new Date(t.endsAt).toLocaleString()
                        : 'Not set'}
                    </div>
                  </div>
                  {t.mode === 'off-site' && (
                    <div className="pt-2 mt-2">
                      <ApplyButton
                        taskId={t._id}
                        onSuccess={() => mutateUserTasks()}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
