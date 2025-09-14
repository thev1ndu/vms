'use client';
import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import StableDialog from '@/components/StableDialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import ParticipantsButton from './ParticipantsButton';
import ApplicantsButton from './ApplicantsButton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  status: 'draft' | 'open' | 'closed';
  startsAt?: string;
  endsAt?: string;
  qrImageDataUrl?: string;
};

const CATEGORIES = [
  'logistics',
  'ushering',
  'media',
  'registration',
  'hospitality',
  'cleanup',
] as const;

function toLocalInputValue(d?: string) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const tz = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tz).toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
}

function fromLocalInputValue(s?: string) {
  // Send as Date on PUT (server accepts Date or will coerce)
  return s ? new Date(s) : undefined;
}

export default function TaskTable() {
  const [filters, setFilters] = useState({
    mode: 'all',
    category: '',
    status: 'open',
  });

  const qs = new URLSearchParams();
  if (filters.mode !== 'all') qs.set('mode', filters.mode);
  if (filters.category) qs.set('category', filters.category);
  if (filters.status) qs.set('status', filters.status);

  const { data, mutate } = useSWR<{ tasks: Task[] }>(
    `/api/tasks?${qs.toString()}`,
    fetcher
  );

  useEffect(() => {
    const h = () => mutate();
    window.addEventListener('task:refresh', h);
    return () => window.removeEventListener('task:refresh', h);
  }, [mutate]);

  const tasks = useMemo(() => {
    const taskList = data?.tasks || [];
    // Sort by _id (MongoDB ObjectId contains timestamp) with most recent first
    return taskList.sort((a, b) => b._id.localeCompare(a._id));
  }, [data]);

  // Editing state
  const [editing, setEditing] = useState<Task | null>(null);
  const [editData, setEditData] = useState<{
    title: string;
    description: string;
    mode: 'on-site' | 'off-site';
    category: string;
    levelRequirement: number;
    volunteersRequired: number;
    xpReward: number;
    status: 'draft' | 'open' | 'closed';
    startsAt: string; // datetime-local value
    endsAt: string; // datetime-local value
  } | null>(null);

  // Delete state
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [deleteMessage, setDeleteMessage] = useState('');
  const [deleteTitle, setDeleteTitle] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  function openEdit(t: Task) {
    setEditing(t);
    setEditData({
      title: t.title,
      description: t.description,
      mode: t.mode,
      category: t.category,
      levelRequirement: t.levelRequirement,
      volunteersRequired: t.volunteersRequired,
      xpReward: t.xpReward,
      status: t.status,
      startsAt: toLocalInputValue(t.startsAt),
      endsAt: toLocalInputValue(t.endsAt),
    });
  }

  async function saveEdit() {
    if (!editing || !editData) return;

    const res = await fetch(`/api/tasks/${editing._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...editData,
        // Send Dates so server can store proper Date types
        startsAt: fromLocalInputValue(editData.startsAt),
        endsAt: fromLocalInputValue(editData.endsAt),
      }),
    });
    const j = await res.json();
    if (!res.ok) {
      console.error('Update failed', j);
      return alert(j.error || j.message || 'Update failed');
    }
    setEditing(null);
    setEditData(null);
    mutate();
    // let other views refresh too
    window.dispatchEvent(new Event('task:refresh'));
  }

  function openDelete(task: Task) {
    setDeleting(task);
    setDeleteTitle('DELETE TASK');
    setDeleteMessage(
      `Are you sure you want to delete "${task.title}"? This action cannot be undone.`
    );
    setIsDeleting(false);
  }

  async function confirmDelete() {
    if (!deleting) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${deleting._id}`, {
        method: 'DELETE',
      });
      const j = await res.json();
      if (!res.ok) {
        setDeleteTitle('ERROR');
        setDeleteMessage(j.error || 'Delete failed');
        setIsDeleting(false);
      } else {
        setDeleteTitle('SUCCESS');
        setDeleteMessage('Task deleted successfully!');
        // Close dialog after a brief delay
        setTimeout(() => {
          setDeleting(null);
          setDeleteMessage('');
          setDeleteTitle('');
          mutate();
        }, 1500);
      }
    } catch (error) {
      setDeleteTitle('ERROR');
      setDeleteMessage('Delete failed');
      setIsDeleting(false);
    }
  }

  return (
    <Card className="bg-transparent border-2 border-[#A5D8FF] rounded-none">
      <CardHeader className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <CardTitle className="text-[#A5D8FF]"></CardTitle>

        {/* Mobile-responsive filters */}
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
          {/* First row of filters on mobile */}
          <div className="flex gap-2">
            {/* Mode filter */}
            <Select
              value={filters.mode}
              onValueChange={(v) => setFilters({ ...filters, mode: v })}
            >
              <SelectTrigger className="w-full sm:w-[140px] rounded-none text-white">
                <SelectValue placeholder="Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value="on-site">On-site</SelectItem>
                <SelectItem value="off-site">Off-site</SelectItem>
              </SelectContent>
            </Select>

            {/* Status filter */}
            <Select
              value={filters.status}
              onValueChange={(v) => setFilters({ ...filters, status: v })}
            >
              <SelectTrigger className="w-full sm:w-[140px] rounded-none text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Second row of filters on mobile */}
          <div className="flex gap-2">
            {/* Category filter */}
            <Input
              placeholder="Category"
              value={filters.category}
              onChange={(e) =>
                setFilters({ ...filters, category: e.target.value })
              }
              className="flex-1 sm:w-[160px] text-white rounded-none"
            />

            <Button
              variant="secondary"
              onClick={() => mutate()}
              className="rounded-none whitespace-nowrap"
            >
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 px-3 sm:px-6">
        {tasks.length === 0 ? (
          <div className="text-base text-white">No tasks</div>
        ) : (
          tasks.map((t) => (
            <Card
              key={t._id}
              className="bg-transparent border-2 border-[#A5D8FF] rounded-none text-white"
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="truncate text-base sm:text-lg">
                    {t.title}
                  </span>
                  <span className="text-base sm:text-lg text-muted-white opacity-90 self-start sm:self-center">
                    {t.xpReward} XP
                  </span>
                </CardTitle>

                {/* Mobile-responsive task info */}
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:flex sm:justify-between sm:gap-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
                    <div>
                      Mode: <span className="capitalize">{t.mode}</span>
                    </div>
                    <div>
                      Category: <span className="capitalize">{t.category}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
                    <div>Level: {t.levelRequirement}+</div>
                    <div>
                      Capacity: {t.volunteersAssigned?.length || 0}/
                      {t.volunteersRequired}
                    </div>
                    <div>
                      Status: <span className="capitalize">{t.status}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                <div className="text-sm">{t.description}</div>

                {/* Date information */}
                {(t.startsAt || t.endsAt) && (
                  <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:justify-between">
                    {t.startsAt && (
                      <div>
                        Start: {new Date(t.startsAt).toLocaleDateString()}
                      </div>
                    )}
                    {t.endsAt && (
                      <div>End: {new Date(t.endsAt).toLocaleDateString()}</div>
                    )}
                  </div>
                )}

                {/* Action buttons - responsive layout */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                  {t.qrImageDataUrl && t.mode === 'on-site' && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="rounded-none"
                        >
                          QR
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-[95vw] max-w-md border-2 border-[#A5D8FF] bg-[#000000] rounded-none">
                        <DialogHeader className="p-0">
                          <DialogTitle className="mx-auto w-[90%] bg-[#C49799] j text-xl text-black text-center py-3 mb-4">
                            TASK QR
                          </DialogTitle>
                        </DialogHeader>
                        <div className="flex items-center justify-center p-4">
                          <img
                            src={t.qrImageDataUrl}
                            alt="Task QR"
                            className="w-56 h-56 max-w-full"
                          />
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                  <ParticipantsButton taskId={t._id} />
                  {t.mode === 'off-site' && <ApplicantsButton taskId={t._id} />}
                  <Button
                    size="sm"
                    onClick={() => openEdit(t)}
                    className="rounded-none"
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => openDelete(t)}
                    className="rounded-none"
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}

        {/* Edit dialog - mobile responsive */}
        <StableDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          title="EDIT TASK"
          contentClassName="w-[95vw] max-w-2xl border-2 border-[#A5D8FF] bg-[#000000] rounded-none max-h-[90vh] overflow-y-auto"
          headerClassName="p-0"
          titleClassName="mx-auto w-[90%] bg-[#C49799] j text-xl text-black text-center py-3 mb-4"
        >
          {editing && editData && (
            <div className="grid gap-3 p-1">
              {/* Title */}
              <div className="grid gap-2">
                <Label className="text-[#A5D8FF]">Title</Label>
                <Input
                  value={editData.title}
                  onChange={(e) =>
                    setEditData({ ...editData, title: e.target.value })
                  }
                  className="text-white rounded-none"
                />
              </div>

              {/* Description */}
              <div className="grid gap-2">
                <Label className="text-[#A5D8FF]">Description</Label>
                <Textarea
                  value={editData.description}
                  onChange={(e) =>
                    setEditData({ ...editData, description: e.target.value })
                  }
                  className="text-white rounded-none min-h-[80px]"
                />
              </div>

              {/* Mode & Category - stack on mobile */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label className="text-[#A5D8FF]">Mode</Label>
                  <Select
                    value={editData.mode}
                    onValueChange={(v) =>
                      setEditData({ ...editData, mode: v as any })
                    }
                  >
                    <SelectTrigger className="rounded-none text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="on-site">On-site</SelectItem>
                      <SelectItem value="off-site">Off-site</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label className="text-[#A5D8FF]">
                    Category (pick or type)
                  </Label>
                  <Input
                    list="category-list-edit"
                    value={editData.category}
                    onChange={(e) =>
                      setEditData({ ...editData, category: e.target.value })
                    }
                    className="text-white rounded-none"
                  />
                  <datalist id="category-list-edit">
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Level / Capacity / XP - stack on mobile */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label className="text-[#A5D8FF]">Level Requirement</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    step={1}
                    value={editData.levelRequirement}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        levelRequirement: Math.max(
                          1,
                          Math.min(10, Number(e.target.value) || 1)
                        ),
                      })
                    }
                    className="text-white rounded-none"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[#A5D8FF]">Volunteers Required</Label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={editData.volunteersRequired}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        volunteersRequired: Math.max(
                          1,
                          Number(e.target.value) || 1
                        ),
                      })
                    }
                    className="text-white rounded-none"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[#A5D8FF]">XP Reward</Label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={editData.xpReward}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        xpReward: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                    className="text-white rounded-none"
                  />
                </div>
              </div>

              {/* Status / Dates - responsive grid */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label className="text-[#A5D8FF]">Status</Label>
                  <Select
                    value={editData.status}
                    onValueChange={(v) =>
                      setEditData({ ...editData, status: v as any })
                    }
                  >
                    <SelectTrigger className="rounded-none text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label className="text-[#A5D8FF]">Starts At</Label>
                  <Input
                    type="datetime-local"
                    value={editData.startsAt}
                    onChange={(e) =>
                      setEditData({ ...editData, startsAt: e.target.value })
                    }
                    className="text-white rounded-none [&::-webkit-calendar-picker-indicator]:hidden"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[#A5D8FF]">Ends At</Label>
                  <Input
                    type="datetime-local"
                    value={editData.endsAt}
                    onChange={(e) =>
                      setEditData({ ...editData, endsAt: e.target.value })
                    }
                    className="text-white rounded-none [&::-webkit-calendar-picker-indicator]:hidden"
                  />
                </div>
              </div>

              {/* Action buttons - stack on mobile */}
              <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:justify-end">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditing(null);
                    setEditData(null);
                  }}
                  className="rounded-none order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveEdit}
                  className="bg-[#A5D8FF] text-black hover:bg-[#A5D8FF] rounded-none order-1 sm:order-2"
                >
                  Save
                </Button>
              </div>
            </div>
          )}
        </StableDialog>

        {/* Delete confirmation dialog */}
        <StableDialog
          open={!!deleting}
          onOpenChange={(o) => !o && setDeleting(null)}
          title={deleteTitle || 'DELETE TASK'}
          contentClassName="sm:max-w-md border-2 border-[#A5D8FF] bg-[#000000] rounded-none"
          headerClassName="p-0"
          titleClassName="mx-auto w-[90%] bg-[#C49799] j text-xl text-black text-center py-3 mb-4"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-center p-4">
              <p className="text-sm text-white text-center">{deleteMessage}</p>
            </div>

            {deleteTitle === 'DELETE TASK' && (
              <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:justify-end">
                <Button
                  variant="secondary"
                  onClick={() => setDeleting(null)}
                  className="rounded-none order-2 sm:order-1"
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDelete}
                  className="rounded-none order-1 sm:order-2"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            )}
          </div>
        </StableDialog>
      </CardContent>
    </Card>
  );
}
