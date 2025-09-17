'use client';
import useSWR from 'swr';
import { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
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
  isRecommended?: boolean;
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
  const [isLoading, setIsLoading] = useState(false);

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
        console.error('Apply failed:', j.error || 'Apply failed');
        // You could add a toast notification here if needed
      } else {
        // Success - refresh data to hide the task
        onSuccess?.();
      }
    } catch (error) {
      console.error('Apply failed:', error);
      // You could add a toast notification here if needed
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button
      onClick={handleApply}
      disabled={isLoading}
      className="w-full bg-[#A5D8FF] text-black hover:bg-[#A5D8FF] rounded-none cursor-pointer text-lg"
    >
      {isLoading ? 'Applying...' : 'Apply'}
    </Button>
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

  const { data: recommendedData } = useSWR<{
    recommendedTasks: Task[];
  }>('/api/me/recommended-tasks', fetcher);

  const tasks = useMemo(() => {
    const allTasks = data?.tasks ?? [];
    const recommendedTasks = recommendedData?.recommendedTasks ?? [];

    // Collect all task IDs that user has participated in (applied, accepted, or completed)
    const participatedTaskIds = new Set([
      ...(userTasks?.applied ?? []).map((p) => p.taskId),
      ...(userTasks?.accepted ?? []).map((p) => p.taskId),
      ...(userTasks?.completed ?? []).map((p) => p.taskId),
    ]);

    // Create a set of recommended task IDs for quick lookup
    const recommendedTaskIds = new Set(
      recommendedTasks.map((task) => task._id)
    );

    // Filter out tasks that user has already participated in
    const filteredTasks = allTasks.filter(
      (task) => !participatedTaskIds.has(task._id)
    );

    // Filter recommended tasks to only include those matching current tab and not participated in
    const filteredRecommendedTasks = recommendedTasks.filter(
      (task) => task.mode === tab && !participatedTaskIds.has(task._id)
    );

    // Create a set of recommended task IDs for deduplication
    const recommendedTaskIdSet = new Set(
      filteredRecommendedTasks.map((task) => task._id)
    );

    // Filter out regular tasks that are already in recommended tasks to avoid duplicates
    const filteredTasksWithoutRecommended = filteredTasks.filter(
      (task) => !recommendedTaskIdSet.has(task._id)
    );

    // Combine recommended tasks at the top with regular tasks (no duplicates)
    const combinedTasks = [
      ...filteredRecommendedTasks,
      ...filteredTasksWithoutRecommended,
    ];

    // Add isRecommended flag to each task
    return combinedTasks.map((task) => ({
      ...task,
      isRecommended: recommendedTaskIds.has(task._id),
    }));
  }, [data, recommendedData, userTasks, tab]);

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
                className={`bg-transparent border-2 rounded-none text-white ${
                  t.mode === 'on-site'
                    ? 'border-yellow-400'
                    : 'border-[#A5D8FF]'
                }`}
              >
                <CardHeader>
                  {t.isRecommended && (
                    <Badge
                      variant="outline"
                      className="text-white border-[#000000] rounded-none bg-black"
                    >
                      RECOMMENDED
                    </Badge>
                  )}
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{t.title}</span>
                    </div>
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
