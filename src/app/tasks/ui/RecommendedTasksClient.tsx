'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import StableDialog from '@/components/StableDialog';
import useSWR from 'swr';

interface RecommendedTask {
  _id: string;
  title: string;
  description: string;
  mode: 'on-site' | 'off-site';
  category: string;
  levelRequirement: number;
  volunteersRequired: number;
  volunteersAssigned: string[];
  xpReward: number;
  status: string;
  startsAt?: string;
  endsAt?: string;
  createdAt: string;
  updatedAt: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'same-origin' });
  const j = await res.json();
  if (!res.ok) throw new Error(j?.error || 'Failed to load');
  return j;
};

export default function RecommendedTasksClient() {
  const { data, error, isLoading, mutate } = useSWR<{
    recommendedTasks: RecommendedTask[];
  }>('/api/me/recommended-tasks', fetcher);

  const recommendedTasks = data?.recommendedTasks || [];

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

  if (isLoading) {
    return (
      <Card className="bg-transparent border-2 border-[#A5D8FF] rounded-none">
        <CardHeader>
          <CardTitle className="flex items-center text-[#A5D8FF]">
            <Star className="h-5 w-5 mr-2" />
            Recommended Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-white py-4">
            Loading recommendations...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-transparent border-2 border-[#A5D8FF] rounded-none">
        <CardHeader>
          <CardTitle className="flex items-center text-[#A5D8FF]">
            <Star className="h-5 w-5 mr-2" />
            Recommended Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-400 py-4">
            Failed to load recommendations
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-transparent border-2 border-[#A5D8FF] rounded-none">
      <CardHeader>
        <CardTitle className="flex items-center text-[#A5D8FF]">
          <Star className="h-5 w-5 mr-2" />
          Recommended Tasks ({recommendedTasks.length})
        </CardTitle>
        <p className="text-sm text-gray-400 mt-1">
          Tasks matching your category preferences and level
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {recommendedTasks.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">No recommended tasks available</p>
              <p className="text-xs">
                Set your category preferences in your profile to get
                personalized recommendations
              </p>
            </div>
          ) : (
            recommendedTasks.map((task) => (
              <Card
                key={task._id}
                className="bg-[#000000] border-2 border-[#A5D8FF] rounded-none text-white"
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{task.title}</span>
                    <span className="text-lg text-muted-white opacity-90">
                      {task.xpReward} XP
                    </span>
                  </CardTitle>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <div className="flex-1 text-left">
                      Category:{' '}
                      <span className="capitalize">{task.category}</span>
                    </div>
                    <div className="flex-1 text-center">
                      Level: {task.levelRequirement}+
                    </div>
                    <div className="flex-1 text-right">
                      Capacity: {task.volunteersAssigned?.length ?? 0}/
                      {task.volunteersRequired}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm">{task.description}</div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <div>
                      Start:{' '}
                      {task.startsAt
                        ? new Date(task.startsAt).toLocaleString()
                        : 'Not set'}
                    </div>
                    <div>
                      End:{' '}
                      {task.endsAt
                        ? new Date(task.endsAt).toLocaleString()
                        : 'Not set'}
                    </div>
                  </div>
                  <div className="pt-2 mt-2">
                    <ApplyButton taskId={task._id} onSuccess={() => mutate()} />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
