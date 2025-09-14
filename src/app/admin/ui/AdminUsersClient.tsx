'use client';

import React, { useMemo, useState } from 'react';
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
import { Input } from '@/components/ui/input';

type AdminUser = {
  authUserId: string;
  email?: string;
  name?: string;
  role: string;
  status: 'pending' | 'approved' | 'blocked';
  volunteerId?: string | null;
  xp: number;
  level: number;
  chatTag?: string | null;
  createdAt?: string | null;
};

const fetcher = async (u: string) => {
  const res = await fetch(u, { credentials: 'same-origin' });
  const j = await res.json();
  if (!res.ok) throw new Error(j?.error || 'Failed to load');
  return j;
};

function Row({
  u,
  onApprove,
  onReject,
  onSetTag,
  onChangeStatus,
}: {
  u: AdminUser;
  onApprove: (id: string, email?: string) => void;
  onReject: (id: string, email?: string) => void;
  onSetTag: (id: string, tag: string) => Promise<void>;
  onChangeStatus: (
    id: string,
    email: string | undefined,
    status: 'approved' | 'pending' | 'blocked'
  ) => Promise<void>;
  onDelete?: (id: string, email?: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [tag, setTag] = useState(u.chatTag || '');

  return (
    <div className="grid grid-cols-8 gap-2 items-center border-b py-2 text-sm">
      <div className="col-span-2">
        <div className="truncate font-medium">{u.name || 'Volunteer'}</div>
        <div className="truncate text-xs text-muted-foreground">{u.email}</div>
      </div>
      <div className="font-mono">{u.volunteerId || '—'}</div>
      <div className="uppercase">{u.role}</div>

      {/* Status column */}
      <div>
        {u.status === 'approved' ? (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onChangeStatus(u.authUserId, u.email, 'blocked')}
          >
            Block
          </Button>
        ) : (
          <span className="uppercase">{u.status}</span>
        )}
      </div>

      {/* XP / Level quick glance */}
      <div className="text-xs text-muted-foreground">
        L{u.level} • {u.xp} XP
      </div>

      {/* Actions */}
      <div className="col-span-2 flex gap-2 justify-end">
        {u.status !== 'approved' ? (
          <>
            <Button size="sm" onClick={() => onApprove(u.authUserId, u.email)}>
              Approve
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onReject(u.authUserId, u.email)}
            >
              Reject
            </Button>
          </>
        ) : (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="secondary">
                Edit Tag
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Chat Tag</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="e.g., MediaLead-Jane"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      await onSetTag(u.authUserId, tag.trim());
                      setOpen(false);
                    }}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}

export default function AdminUsersClient() {
  const { data, error, isLoading, mutate } = useSWR<{ users: AdminUser[] }>(
    '/api/admin/users',
    fetcher
  );

  const users = data?.users ?? [];
  const pending = useMemo(
    () => users.filter((u) => u.status === 'pending'),
    [users]
  );
  const approved = useMemo(
    () => users.filter((u) => u.status === 'approved'),
    [users]
  );
  const blocked = useMemo(
    () => users.filter((u) => u.status === 'blocked'),
    [users]
  );

  async function approve(authUserId: string, email?: string) {
    const res = await fetch('/api/admin/approve-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authUserId, email, status: 'approved' }),
    });
    const j = await res.json();
    if (!res.ok) return alert(j.error || 'Approve failed');
    mutate();
  }

  async function reject(authUserId: string, email?: string) {
    const res = await fetch('/api/admin/approve-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authUserId, email, status: 'blocked' }),
    });
    const j = await res.json();
    if (!res.ok) return alert(j.error || 'Reject failed');
    mutate();
  }

  async function changeStatus(
    authUserId: string,
    email: string | undefined,
    status: 'approved' | 'pending' | 'blocked'
  ) {
    const res = await fetch('/api/admin/approve-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ authUserId, email, status }),
    });

    if (res.status === 204) {
      mutate();
      return;
    }

    const text = await res.text();
    const data = text
      ? (() => {
          try {
            return JSON.parse(text);
          } catch {
            return null;
          }
        })()
      : null;

    if (!res.ok) {
      alert((data as any)?.error || `Status update failed (${res.status})`);
      return;
    }

    mutate();
  }

  async function setTag(authUserId: string, chatTag: string) {
    const res = await fetch('/api/admin/chat-tag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authUserId, chatTag }),
    });
    const j = await res.json();
    if (!res.ok) return alert(j.error || 'Failed to set tag');
    mutate();
  }

  return (
    <div className="grid gap-6">
      {/* PENDING USERS */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Pending Users</CardTitle>
          <div className="text-xs text-muted-foreground">
            {isLoading
              ? 'Loading…'
              : error
              ? 'Error loading'
              : `${pending.length} pending`}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && (
            <div className="text-sm text-muted-foreground">Loading…</div>
          )}
          {error && (
            <div className="text-sm text-red-600">
              {String(error.message || error)}
            </div>
          )}
          {!isLoading && !error && pending.length === 0 && (
            <div className="text-sm text-muted-foreground">None</div>
          )}
          {!isLoading && !error && pending.length > 0 && (
            <>
              <div className="grid grid-cols-8 gap-2 px-2 py-2 text-xs font-medium text-muted-foreground border-b">
                <div className="col-span-2">Name / Email</div>
                <div>Volunteer ID</div>
                <div>Role</div>
                <div>Status</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>
              {pending.map((u) => (
                <Row
                  key={u.authUserId}
                  u={u}
                  onApprove={approve}
                  onReject={reject}
                  onSetTag={setTag}
                  onChangeStatus={changeStatus}
                />
              ))}
            </>
          )}
        </CardContent>
      </Card>

      {/* ALL USERS (Approved) */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>All Users</CardTitle>
          <Button size="sm" variant="secondary" onClick={() => mutate()}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && (
            <div className="text-sm text-muted-foreground">Loading…</div>
          )}
          {error && (
            <div className="text-sm text-red-600">
              {String(error.message || error)}
            </div>
          )}
          {!isLoading && !error && approved.length === 0 && (
            <div className="text-sm text-muted-foreground">
              No approved users yet
            </div>
          )}
          {!isLoading && !error && approved.length > 0 && (
            <>
              <div className="grid grid-cols-8 gap-2 px-2 py-2 text-xs font-medium text-muted-foreground border-b">
                <div className="col-span-2">Name / Email</div>
                <div>Volunteer ID</div>
                <div>Role</div>
                <div>Status</div>
                <div>XP / Level</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>
              {approved.map((u) => (
                <Row
                  key={u.authUserId}
                  u={u}
                  onApprove={approve}
                  onReject={reject}
                  onSetTag={setTag}
                  onChangeStatus={changeStatus}
                />
              ))}
            </>
          )}
        </CardContent>
      </Card>

      {/* blocked USERS */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Blocked Users</CardTitle>
          <div className="text-xs text-muted-foreground">
            {isLoading
              ? 'Loading…'
              : error
              ? 'Error loading'
              : `${blocked.length} blocked`}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && (
            <div className="text-sm text-muted-foreground">Loading…</div>
          )}
          {error && (
            <div className="text-sm text-red-600">
              {String(error.message || error)}
            </div>
          )}
          {!isLoading && !error && blocked.length === 0 && (
            <div className="text-sm text-muted-foreground">None</div>
          )}
          {!isLoading && !error && blocked.length > 0 && (
            <>
              <div className="grid grid-cols-8 gap-2 px-2 py-2 text-xs font-medium text-muted-foreground border-b">
                <div className="col-span-2">Name / Email</div>
                <div>Volunteer ID</div>
                <div>Role</div>
                <div>Status</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>
              {blocked.map((u) => (
                <Row
                  key={u.authUserId}
                  u={u}
                  onApprove={approve}
                  onReject={reject}
                  onSetTag={setTag}
                  onChangeStatus={changeStatus}
                />
              ))}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}