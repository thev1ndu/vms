'use client';
import useSWR from 'swr';
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StableDialog from '@/components/StableDialog';
import '@/components/components.css';

type Task = {
  _id: string;
  title?: string;
  description?: string;
  mode?: string;
  category?: string;
  levelRequirement?: number;
  xpReward?: number;
  startDate?: string;
  endDate?: string;
};

type Participation = {
  taskId: string;
  task?: Task;
  status?: string;
  xpEarned?: number;
  badgesEarned?: any[];
  createdAt?: string; // Applied date
  proof?: string; // Completion proof
};

type MyTasksData = {
  applied: Participation[];
  accepted: Participation[];
  completed: Participation[];
};

const fetcher = (u: string) => fetch(u).then((r) => r.json());

function MarkCompletedButton({
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
  const [completedSuccessfully, setCompletedSuccessfully] = useState(false);
  const [proof, setProof] = useState('');

  async function handleMarkCompleted() {
    if (!proof.trim()) {
      setTitle('ERROR');
      setMessage('Please provide proof of completion');
      setOpen(true);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/participations/mark-completed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, proof }),
      });
      const j = await res.json();
      if (!res.ok) {
        setTitle('ERROR');
        setMessage(j.error || 'Mark completed failed');
        setCompletedSuccessfully(false);
      } else {
        setTitle('SUCCESS');
        const xpMessage = j.xpAwarded ? ` +${j.xpAwarded} XP` : '';
        const badgeMessage =
          j.badgesEarned > 0 ? ` +${j.badgesEarned} Badge(s)` : '';
        const levelMessage = j.level ? ` (Level ${j.level})` : '';
        setMessage(`Task completed!${xpMessage}${badgeMessage}${levelMessage}`);
        setCompletedSuccessfully(true);
        setProof('');
      }
    } catch (error) {
      setTitle('ERROR');
      setMessage('Mark completed failed');
      setCompletedSuccessfully(false);
    } finally {
      setIsLoading(false);
    }
  }

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    // If dialog is being closed and completion was successful, refresh data
    if (!newOpen && completedSuccessfully) {
      onSuccess?.();
    }
  }

  return (
    <StableDialog
      open={open}
      onOpenChange={handleOpenChange}
      trigger={
        <Button
          onClick={() => setOpen(true)}
          disabled={isLoading}
          className="w-full bg-[#A5D8FF] text-black hover:bg-[#A5D8FF] rounded-none cursor-pointer text-lg"
        >
          {isLoading ? 'Submitting...' : 'Mark Completed'}
        </Button>
      }
      title="MARK TASK AS COMPLETED"
      contentClassName="sm:max-w-md border-2 border-[#A5D8FF] bg-[#000000] rounded-none"
      headerClassName="p-0"
      titleClassName="mx-auto w-[90%] j bg-[#C49799] text-xl text-black text-center py-3 mb-4"
    >
      <div className="p-4 space-y-4">
        <div>
          <label className="block text-sm text-white mb-2">
            Describe the proof of completion:
          </label>
          <textarea
            value={proof}
            onChange={(e) => setProof(e.target.value)}
            placeholder="Describe how you completed this task..."
            className="w-full p-3 bg-transparent border border-[#A5D8FF] text-white rounded-none resize-none"
            rows={4}
          />
        </div>
        <div className="flex justify-center">
          <Button
            onClick={handleMarkCompleted}
            disabled={isLoading || !proof.trim()}
            className="bg-[#A5D8FF] text-black hover:bg-[#A5D8FF] rounded-none cursor-pointer"
          >
            {isLoading ? 'Submitting...' : 'Submit Proof'}
          </Button>
        </div>
        {message && (
          <div className="text-center">
            <p
              className={`text-sm ${
                title === 'ERROR' ? 'text-red-400' : 'text-green-400'
              }`}
            >
              {message}
            </p>
          </div>
        )}
      </div>
    </StableDialog>
  );
}

function WithdrawButton({
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
  const [withdrawnSuccessfully, setWithdrawnSuccessfully] = useState(false);

  async function handleWithdraw() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/tasks/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      });
      const j = await res.json();
      if (!res.ok) {
        setTitle('ERROR');
        setMessage(j.error || 'Withdraw failed');
        setWithdrawnSuccessfully(false);
      } else {
        setTitle('SUCCESS');
        setMessage('Withdrawn!');
        setWithdrawnSuccessfully(true);
        // Don't refresh data immediately - wait for dialog to close
      }
    } catch (error) {
      setTitle('ERROR');
      setMessage('Withdraw failed');
      setWithdrawnSuccessfully(false);
    } finally {
      setIsLoading(false);
    }
  }

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    // If dialog is being closed and withdrawal was successful, refresh data to hide the task
    if (!newOpen && withdrawnSuccessfully) {
      onSuccess?.();
    }
  }

  return (
    <StableDialog
      open={open}
      onOpenChange={handleOpenChange}
      trigger={
        <Button
          onClick={handleWithdraw}
          disabled={isLoading}
          className="w-full bg-[#A5D8FF] text-black hover:bg-[#A5D8FF] rounded-none cursor-pointer text-lg"
        >
          {isLoading ? 'Withdrawing...' : 'Withdraw'}
        </Button>
      }
      title={title || 'WITHDRAW FROM TASK'}
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

export default function MyTasksClient({
  defaultTab = 'applied',
}: {
  defaultTab?: string;
}) {
  const { data, mutate } = useSWR<MyTasksData>('/api/me/tasks', fetcher);

  function List({
    rows,
    actions,
  }: {
    rows: Participation[];
    actions?: (row: Participation) => React.ReactNode;
  }) {
    if (!rows?.length)
      return (
        <div className="text-sm text-muted-foreground">Nothing here yet.</div>
      );
    return (
      <div className="grid gap-3">
        {rows.map((r, i) => {
          const t = r.task || ({} as Task);
          return (
            <Card
              key={r.taskId + i}
              className="bg-transparent border-2 border-[#A5D8FF] rounded-none text-white"
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate">{t.title || 'Task'}</span>
                  <span className="text-lg text-muted-white opacity-90">
                    {t.xpReward ?? 0} XP
                  </span>
                </CardTitle>
                <div className="flex justify-center items-center text-xs text-muted-foreground">
                  <div className="flex-1 text-left">
                    Category: <span className="capitalize">{t.category}</span>
                  </div>
                  <div className="flex-1 text-center">
                    Level: {t.levelRequirement}+
                  </div>
                  <div className="flex-1 text-right">Mode: {t.mode}</div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">{t.description || ''}</div>
                <div className="flex justify-center items-center text-xs text-muted-foreground">
                  <div className="flex-1 text-left">
                    Start:{' '}
                    {t.startDate
                      ? new Date(t.startDate).toLocaleDateString()
                      : 'Invalid Date'}
                  </div>
                  {/* <div className="flex-1 text-center">
                    Applied:{' '}
                    {r.createdAt
                      ? new Date(r.createdAt).toLocaleDateString()
                      : 'Invalid Date'}
                  </div> */}
                  <div className="flex-1 text-right">
                    End:{' '}
                    {t.endDate
                      ? new Date(t.endDate).toLocaleDateString()
                      : 'Invalid Date'}
                  </div>
                </div>
                <div className="flex justify-center items-center text-xs text-muted-foreground">
                  <div className="flex-1 text-center">
                    Applied:{' '}
                    {r.createdAt
                      ? new Date(r.createdAt).toLocaleDateString()
                      : 'Invalid Date'}
                  </div>
                </div>
                {actions?.(r)}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <Tabs defaultValue={defaultTab} className="grid gap-4">
      <TabsList className="w-max rounded-none bg-[#A5D8FF]">
        <TabsTrigger
          value="applied"
          className="rounded-none text-base text-black data-[state=active]:text-white"
        >
          Applied
        </TabsTrigger>
        <TabsTrigger
          value="accepted"
          className="rounded-none text-base text-black data-[state=active]:text-white"
        >
          Accepted
        </TabsTrigger>
        <TabsTrigger
          value="completed"
          className="rounded-none text-base text-black data-[state=active]:text-white"
        >
          Completed
        </TabsTrigger>
      </TabsList>

      <TabsContent value="applied">
        <List
          rows={data?.applied || []}
          actions={(r) => (
            <div className="pt-2 mt-2">
              <WithdrawButton taskId={r.taskId} onSuccess={() => mutate()} />
            </div>
          )}
        />
      </TabsContent>

      <TabsContent value="accepted">
        <List
          rows={data?.accepted || []}
          actions={(r) => (
            <div className="pt-2 mt-2">
              <MarkCompletedButton
                taskId={r.taskId}
                onSuccess={() => mutate()}
              />
            </div>
          )}
        />
      </TabsContent>

      <TabsContent value="completed">
        <List rows={data?.completed || []} />
      </TabsContent>
    </Tabs>
  );
}
