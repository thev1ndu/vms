'use client';
import useSWR from 'swr';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import StableDialog from '@/components/StableDialog';
import { X } from 'lucide-react';

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function ParticipantsButton({ taskId }: { taskId: string }) {
  const [open, setOpen] = useState(false);
  const [proofDialogOpen, setProofDialogOpen] = useState(false);
  const [selectedProof, setSelectedProof] = useState<string>('');
  const [proofDialogTitle, setProofDialogTitle] =
    useState<string>('COMPLETION PROOF');
  const [currentProofSubmission, setCurrentProofSubmission] = useState<{
    authUserId: string;
    proofSubmissionId?: string;
  } | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  // Remove participant state - consolidated like Delete Task Dialog
  const [removing, setRemoving] = useState<string | null>(null);
  const [removeMessage, setRemoveMessage] = useState('');
  const [removeTitle, setRemoveTitle] = useState('');
  const [isRemoving, setIsRemoving] = useState(false);
  const { data, mutate } = useSWR<{
    participants: Array<{
      authUserId: string;
      joinedAt: string;
      volunteerId: string | null;
      displayName: string | null;
      level: number;
      xp: number;
      status: string;
      proof: string | null;
      completedAt: string | null;
      hasProofSubmission: boolean;
      proofSubmission: string | null;
      proofSubmissionId: string | null;
    }>;
  }>(`/api/admin/tasks/${taskId}/participants`, fetcher);

  async function complete(id: string) {
    const res = await fetch(`/api/admin/tasks/${taskId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authUserId: id }),
    });
    const j = await res.json();
    if (!res.ok) return alert(j.error || 'Complete failed');
    mutate();
    window.dispatchEvent(new Event('me:refresh'));
    window.dispatchEvent(new Event('task:refresh'));
  }

  function viewProof(
    proof: string,
    isSubmission: boolean = false,
    authUserId?: string,
    proofSubmissionId?: string
  ) {
    setSelectedProof(proof);
    setProofDialogTitle(
      isSubmission ? 'PENDING PROOF SUBMISSION' : 'COMPLETION PROOF'
    );
    setCurrentProofSubmission(
      isSubmission && authUserId ? { authUserId, proofSubmissionId } : null
    );
    setProofDialogOpen(true);
  }

  async function approveProofSubmission() {
    if (!currentProofSubmission?.proofSubmissionId) return;

    setIsApproving(true);
    try {
      const res = await fetch(
        `/api/admin/proof-submissions/${currentProofSubmission.proofSubmissionId}/approve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Failed to approve submission');
        return;
      }

      const result = await res.json();
      alert(
        `Approved! Awarded ${result.xpAwarded} XP and ${result.badgesAwarded} badge(s). New level: ${result.newLevel}`
      );

      // Close dialog and refresh data
      setProofDialogOpen(false);
      mutate();
      window.dispatchEvent(new Event('me:refresh'));
      window.dispatchEvent(new Event('task:refresh'));
    } catch (error) {
      alert('Failed to approve submission');
    } finally {
      setIsApproving(false);
    }
  }

  function initiateRemoveParticipant(authUserId: string) {
    setRemoving(authUserId);
    setRemoveTitle('REMOVE PARTICIPANT');
    setRemoveMessage(
      'Are you sure you want to remove this participant? This will also revoke any XP and badges they earned from this task.'
    );
    setIsRemoving(false);
  }

  async function confirmRemoveParticipant() {
    if (!removing) return;

    setIsRemoving(true);
    try {
      const res = await fetch(`/api/admin/tasks/${taskId}/remove-participant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authUserId: removing }),
      });
      const j = await res.json();

      if (!res.ok) {
        setRemoveTitle('ERROR');
        setRemoveMessage(`Error: ${j.error || 'Remove failed'}`);
        setIsRemoving(false);
        return;
      }

      mutate();
      window.dispatchEvent(new Event('me:refresh'));
      window.dispatchEvent(new Event('task:refresh'));

      if (j.revokedXP > 0 || j.revokedBadges > 0) {
        setRemoveTitle('SUCCESS');
        setRemoveMessage(
          `Participant removed. Revoked: ${j.revokedXP} XP, ${j.revokedBadges} badge(s)`
        );
      } else {
        setRemoveTitle('SUCCESS');
        setRemoveMessage('Participant removed successfully');
      }
      setIsRemoving(false);
    } catch (error) {
      setRemoveTitle('ERROR');
      setRemoveMessage('Remove failed');
      setIsRemoving(false);
    }
  }

  return (
    <>
      <StableDialog
        open={open}
        onOpenChange={setOpen}
        title="PARTICIPANTS"
        contentClassName="sm:max-w-lg border-2 border-[#A5D8FF] bg-[#000000] rounded-none"
        headerClassName="p-0"
        titleClassName="mx-auto w-[90%] bg-[#C49799] j text-xl text-black text-center py-3 mb-4"
        trigger={
          <Button
            size="sm"
            className="bg-[#A5D8FF] text-black hover:bg-[#A5D8FF] rounded-none"
          >
            Participants ({data?.participants?.length || 0})
          </Button>
        }
      >
        <div className="grid gap-2">
          {!data?.participants?.length ? (
            <div className="text-sm text-white">No participants</div>
          ) : (
            data.participants.map((p) => (
              <div
                key={p.authUserId}
                className={`grid grid-cols-6 items-center gap-2 border-b py-2 px-2 text-sm text-white ${
                  p.status === 'completed'
                    ? 'bg-green-500'
                    : p.hasProofSubmission
                    ? 'bg-yellow-500'
                    : ''
                }`}
              >
                <div className="col-span-2 truncate flex items-center gap-1">
                  <span>{p.displayName || p.volunteerId || p.authUserId}</span>
                  <button
                    onClick={() => initiateRemoveParticipant(p.authUserId)}
                    className="text-red-400 hover:text-red-400 ml-1"
                    title="Remove participant"
                  >
                    <X size={12} />
                  </button>
                </div>
                <div>L{p.level}</div>
                <div>{p.xp} XP</div>
                <div className="text-xs text-white">
                  {new Date(p.joinedAt).toLocaleDateString()}
                </div>
                <div className="flex justify-end">
                  {p.status === 'completed' && p.proof ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => viewProof(p.proof!)}
                      className="rounded-none bg-[#000000] text-white hover:bg-[#000000] hover:text-white border-1 border-[#000000]"
                    >
                      View Proof
                    </Button>
                  ) : p.hasProofSubmission ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        viewProof(
                          p.proofSubmission!,
                          true,
                          p.authUserId,
                          p.proofSubmissionId!
                        )
                      }
                      className="rounded-none bg-[#000000] text-white hover:bg-[#000000] hover:text-white border-1 border-[#000000]"
                    >
                      View Proof
                    </Button>
                  ) : p.status === 'accepted' ? (
                    <Button
                      size="sm"
                      onClick={() => complete(p.authUserId)}
                      className="bg-[#A5D8FF] text-black hover:bg-[#A5D8FF] rounded-none"
                    >
                      Complete
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </StableDialog>

      {/* Proof Viewing Dialog */}
      <StableDialog
        open={proofDialogOpen}
        onOpenChange={setProofDialogOpen}
        title={proofDialogTitle}
        contentClassName="sm:max-w-lg border-2 border-[#A5D8FF] bg-[#000000] rounded-none"
        headerClassName="p-0"
        titleClassName="mx-auto w-[90%] bg-[#C49799] j text-xl text-black text-center py-3 mb-4"
      >
        <div className="mt-4">
          <div className="p-4">
            <p className="text-sm text-white whitespace-pre-wrap">
              {selectedProof}
            </p>
          </div>

          {/* Show Approve button for pending proof submissions */}
          {currentProofSubmission && (
            <div className="flex justify-end p-4 pt-0">
              <Button
                onClick={approveProofSubmission}
                disabled={isApproving}
                className="bg-green-600 hover:bg-green-700 text-white rounded-none"
              >
                {isApproving ? 'Approving...' : 'Approve'}
              </Button>
            </div>
          )}
        </div>
      </StableDialog>

      {/* Remove Participant Dialog - consolidated like Delete Task Dialog */}
      <StableDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={removeTitle || 'REMOVE PARTICIPANT'}
        contentClassName="sm:max-w-md border-2 border-[#A5D8FF] bg-[#000000] rounded-none"
        headerClassName="p-0"
        titleClassName="mx-auto w-[90%] bg-[#C49799] j text-xl text-black text-center py-3 mb-4"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-center p-4">
            <p className="text-sm text-white text-center">{removeMessage}</p>
          </div>

          {removeTitle === 'REMOVE PARTICIPANT' && (
            <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                onClick={() => setRemoving(null)}
                className="rounded-none order-2 sm:order-1"
                disabled={isRemoving}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmRemoveParticipant}
                className="rounded-none order-1 sm:order-2"
                disabled={isRemoving}
              >
                {isRemoving ? 'Removing...' : 'Remove'}
              </Button>
            </div>
          )}

          {(removeTitle === 'SUCCESS' || removeTitle === 'ERROR') && (
            <div className="flex justify-end pt-4">
              <Button
                onClick={() => setRemoving(null)}
                className="bg-[#A5D8FF] text-black hover:bg-[#A5D8FF] rounded-none min-w-[80px]"
              >
                OK
              </Button>
            </div>
          )}
        </div>
      </StableDialog>
    </>
  );
}
