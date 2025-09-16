'use client';

import useSWR from 'swr';
import { useMemo, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { progressForXP } from '@/lib/level';
import { levelGradient } from '@/lib/gradients';
import AdminBadge from './AdminBadge';

const fetcher = (u: string) => fetch(u).then((r) => r.json());

interface CompactVolunteerCardProps {
  authUserId: string;
}

export default function CompactVolunteerCard({
  authUserId,
}: CompactVolunteerCardProps) {
  const { data, isLoading } = useSWR<{
    me: {
      xp: number;
      level: number;
      volunteerId: string | null;
      displayName: string | null;
      name: string | null;
      badges: { _id: string; name: string; icon?: string; slug: string }[];
      connections: number;
    };
  }>(`/api/user/${authUserId}`, fetcher);

  const user = data?.me;
  const stats = useMemo(() => progressForXP(user?.xp ?? 0), [user?.xp]);

  // admin users state
  const [adminUsers, setAdminUsers] = useState<Set<string>>(new Set());

  // Fetch admin users
  useEffect(() => {
    const fetchAdminUsers = async () => {
      try {
        const response = await fetch('/api/admin-ids');
        if (response.ok) {
          const data = await response.json();
          const adminSet = new Set<string>(data.adminIds);
          setAdminUsers(adminSet);
        }
      } catch (error) {
        console.error('Failed to fetch admin users:', error);
      }
    };

    fetchAdminUsers();
  }, []);

  // Check if user is admin
  const isUserAdmin = (authUserId: string) => {
    return adminUsers.has(authUserId);
  };

  if (isLoading) {
    return (
      <Card className="relative w-full h-24 bg-transparent border border-[#A5D8FF] overflow-hidden rounded-none">
        <div className="h-full flex items-center justify-center text-xs text-white">
          Loading…
        </div>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="relative w-full h-24 bg-transparent border border-[#A5D8FF] overflow-hidden rounded-none">
        <div className="h-full flex items-center justify-center text-xs text-white">
          User not found
        </div>
      </Card>
    );
  }

  const nextLabel =
    stats.next == null
      ? `Level ${stats.level} (MAX)`
      : `${user.xp - stats.start}/${stats.next - stats.start} XP to Level ${
          stats.level + 1
        }`;

  const ratioPct = Math.max(
    0,
    Math.min(100, Math.round((stats.ratio || 0) * 100))
  );

  // Build the same gradient that LevelBadge uses, applied to the display name
  const g = levelGradient(user.level);
  const gradientStyle: React.CSSProperties = {
    backgroundImage: `linear-gradient(90deg, ${g.from}, ${g.to})`,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
  };

  const displayName =
    user.displayName || user.volunteerId || user.name || 'Volunteer';

  return (
    <Card
      className="relative w-full h-24 bg-transparent border overflow-hidden rounded-none text-white"
      style={{
        borderImage: `linear-gradient(90deg, ${g.from}, ${g.to}) 1`,
        borderImageSlice: 1,
      }}
    >
      {/* Volunteer ID top-left */}
      {user.volunteerId && (
        <div className="absolute top-1 left-1 z-20">
          <div className="text-base text-white px-2 py-1">
            {user.volunteerId}
          </div>
        </div>
      )}

      {/* Foreground content */}
      <div className="relative z-10 h-full p-2 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          {/* Left: name + level info */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="min-w-0 leading-tight">
              <div className="flex items-center gap-1">
                <div
                  className="text-sm font-semibold truncate"
                  style={gradientStyle}
                >
                  {displayName}
                </div>
                {isUserAdmin(authUserId) && <AdminBadge />}
              </div>
              <div className="text-xs truncate">
                <span>Level {user.level}</span>
                {' ~ '}
                <span>Connections {user.connections ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Right: XP */}
          <div className="text-sm shrink-0">{user.xp} XP</div>
        </div>

        <div className="space-y-1">
          <div className="h-1 w-full rounded bg-muted/70 overflow-hidden">
            <div
              className="h-full bg-white"
              style={{ width: `${ratioPct}%` }}
            />
          </div>
          <div className="text-xs leading-none truncate">{nextLabel}</div>
        </div>

        <div className="flex-1" />
      </div>
    </Card>
  );
}
