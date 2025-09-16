'use client';
import useSWR from 'swr';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import StableDialog from '@/components/StableDialog';

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function ApplicantsButton({ taskId }: { taskId: string }) {
  const [open, setOpen] = useState(false);
  const { data, mutate } = useSWR<{
    applicants: Array<{
      authUserId: string;
      appliedAt: string;
      volunteerId: string | null;
      displayName: string | null;
      level: number;
      xp: number;
    }>;
  }>(`/api/admin/tasks/${taskId}/applicants`, fetcher);

  async function accept(id: string) {
    const res = await fetch(`/api/admin/tasks/${taskId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authUserId: id }),
    });
    const j = await res.json();
    if (!res.ok) return alert(j.error || 'Accept failed');
    mutate();
    window.dispatchEvent(new Event('task:refresh'));
  }

  return (
    <StableDialog
      open={open}
      onOpenChange={setOpen}
      title="APPLICANTS"
      contentClassName="sm:max-w-lg border-2 border-[#A5D8FF] bg-[#000000] rounded-none"
      headerClassName="p-0"
      titleClassName="mx-auto w-[90%] bg-[#C49799] j text-xl text-black text-center py-3 mb-4"
      trigger={
        <Button
          size="sm"
          className="bg-[#A5D8FF] text-black hover:bg-[#A5D8FF] rounded-none"
        >
          Applicants ({data?.applicants?.length || 0})
        </Button>
      }
    >
      <div className="grid gap-2">
        {!data?.applicants?.length ? (
          <div className="text-sm text-white">No applicants</div>
        ) : (
          data.applicants.map((a) => (
            <div
              key={a.authUserId}
              className="grid grid-cols-6 items-center gap-2 border-b py-2 text-sm text-white"
            >
              <div className="col-span-2 truncate">
                {a.displayName || a.volunteerId || a.authUserId}
              </div>
              <div>L{a.level}</div>
              <div>{a.xp} XP</div>
              <div className="text-xs text-white">
                {new Date(a.appliedAt).toLocaleDateString()}
              </div>
              <div className="text-right">
                <Button
                  size="sm"
                  onClick={() => accept(a.authUserId)}
                  className="bg-[#A5D8FF] text-black hover:bg-[#A5D8FF] rounded-none"
                >
                  Accept
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </StableDialog>
  );
}
