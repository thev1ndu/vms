'use client';

import useSWR from 'swr';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { progressForXP } from '@/lib/level';
import { levelGradient } from '@/lib/gradients';
import MyQRButton from './MyQRButton';
import { Shield } from 'lucide-react';
import { useSession } from '@/lib/auth-client';

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function VolunteerCard() {
  const { data, mutate } = useSWR<{
    me: {
      xp: number;
      level: number;
      volunteerId: string | null;
      chatTag: string | null;
      badges: { _id: string; name: string; icon?: string; slug: string }[];
      connections: number;
    };
  }>('/api/me', fetcher, { refreshInterval: 5000 });

  // session for admin check
  const { data: session } = useSession();

  // admin users state
  const [adminUsers, setAdminUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    const h = () => mutate();
    window.addEventListener('me:refresh', h);
    window.addEventListener('task:refresh', h);
    return () => {
      window.removeEventListener('me:refresh', h);
      window.removeEventListener('task:refresh', h);
    };
  }, [mutate]);

  // Fetch admin users
  useEffect(() => {
    const fetchAdminUsers = async () => {
      try {
        const response = await fetch('/api/admin/users');
        if (response.ok) {
          const data = await response.json();
          const adminSet = new Set<string>(
            data.users
              .filter(
                (user: any) =>
                  user.role === 'admin' && user.status === 'approved'
              )
              .map((user: any) => user.authUserId)
          );
          setAdminUsers(adminSet);
        }
      } catch (error) {
        console.error('Failed to fetch admin users:', error);
      }
    };

    fetchAdminUsers();
  }, []);

  const me = data?.me;
  const stats = useMemo(() => progressForXP(me?.xp ?? 0), [me?.xp]);

  // Check if current user is admin
  const isUserAdmin = (authUserId: string) => {
    return adminUsers.has(authUserId);
  };

  const prevBadges = useRef<string[]>([]);
  useEffect(() => {
    if (!me) return;
    const now = (me.badges || []).map((b) => b._id);
    const prev = prevBadges.current;
    if (prev.length && now.length > prev.length) {
      const prevSet = new Set(prev);
      (me.badges || []).forEach((b) => {
        if (!prevSet.has(b._id)) {
          console.log(`Badge earned: ${b.name}`);
        }
      });
    }
    prevBadges.current = now;
  }, [me]);

  const prevLevel = useRef<number | null>(null);
  useEffect(() => {
    if (me?.level == null) return;
    if (prevLevel.current != null && me.level > prevLevel.current) {
      console.log(`Level up! You reached level ${me.level}`);
    }
    prevLevel.current = me.level;
  }, [me?.level]);

  // Function to generate honeycomb positions starting from bottom-right
  const generateHoneycombPositions = (badgeCount: number) => {
    const positions: Array<{ x: number; y: number; isOffset: boolean }> = [];
    const hexW = 20; // 1.25rem = 20px
    const hexH = 23; // 1.44rem ≈ 23px

    if (badgeCount === 0) return positions;

    // Start from bottom-right corner
    positions.push({ x: 0, y: 0, isOffset: false });

    if (badgeCount === 1) return positions;

    // Spiral pattern starting from bottom-right
    let currentRing = 1;
    let placedBadges = 1;

    while (placedBadges < badgeCount) {
      // For each ring, we place hexagons in a spiral pattern
      const ringsToPlace = Math.min(badgeCount - placedBadges, currentRing * 6);

      for (let i = 0; i < ringsToPlace; i++) {
        let x, y, isOffset;

        // Calculate position based on ring and position in ring
        const ringPos = i;
        const side = Math.floor(ringPos / currentRing);
        const posInSide = ringPos % currentRing;

        switch (side) {
          case 0: // Right side moving up
            x = -currentRing;
            y = -posInSide;
            isOffset = currentRing % 2 === 1;
            break;
          case 1: // Top-right to top-left
            x = -currentRing + posInSide;
            y = -currentRing;
            isOffset = (currentRing + posInSide) % 2 === 1;
            break;
          case 2: // Top-left moving down-left
            x = posInSide;
            y = -currentRing + posInSide;
            isOffset = posInSide % 2 === 1;
            break;
          case 3: // Left side moving down
            x = currentRing;
            y = posInSide;
            isOffset = currentRing % 2 === 0;
            break;
          case 4: // Bottom-left to bottom-right
            x = currentRing - posInSide;
            y = currentRing;
            isOffset = (currentRing - posInSide) % 2 === 0;
            break;
          case 5: // Bottom-right moving up-right
            x = -posInSide;
            y = currentRing - posInSide;
            isOffset = posInSide % 2 === 0;
            break;
          default:
            x = 0;
            y = 0;
            isOffset = false;
        }

        positions.push({ x, y, isOffset });
        placedBadges++;

        if (placedBadges >= badgeCount) break;
      }

      currentRing++;
    }

    return positions;
  };

  if (!me) {
    return (
      <Card className="relative w-full h-32 bg-transparent border-2 border-[#A5D8FF] overflow-hidden rounded-none">
        {/* <Card className="relative w-full h-[20vh] bg-transparent border-2 border-[#A5D8FF] overflow-hidden rounded-none"></Card> */}
        <div className="absolute top-2 right-2 z-20">
          <MyQRButton />
        </div>
        <div className="h-full flex items-center justify-center text-xs text-white">
          Loading…
        </div>
      </Card>
    );
  }

  const nextLabel =
    stats.next == null
      ? `Level ${stats.level} (MAX)`
      : `${me.xp - stats.start}/${stats.next - stats.start} XP to Level ${
          stats.level + 1
        }`;

  const ratioPct = Math.max(
    0,
    Math.min(100, Math.round((stats.ratio || 0) * 100))
  );

  const icons = (me.badges || [])
    .map((b) => b.icon)
    .filter(Boolean) as string[];

  const honeycombPositions = generateHoneycombPositions(icons.length);

  // Build the same gradient that LevelBadge uses, applied to the Volunteer ID text
  const g = levelGradient(me.level);
  const gradientStyle: React.CSSProperties = {
    backgroundImage: `linear-gradient(90deg, ${g.from}, ${g.to})`,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
  };

  return (
    <Card
      className="relative w-full h-32 bg-transparent border-2 overflow-hidden rounded-none text-white"
      style={{
        borderImage: `linear-gradient(90deg, ${g.from}, ${g.to}) 1`,
        borderImageSlice: 1,
      }}
    >
      {/* QR trigger top-right */}
      <div className="absolute top-2 right-2 z-20">
        <MyQRButton />
      </div>

      {/* Volunteer ID top-left */}
      {me.volunteerId && (
        <div className="absolute top-2 left-2 z-20">
          <div className="text-base text-white px-2 py-1">{me.volunteerId}</div>
        </div>
      )}

      {/* Honeycomb badge background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-50"
        style={
          {
            ['--hexW' as any]: '1.25rem',
            ['--hexH' as any]: '1.44rem',
          } as React.CSSProperties
        }
        aria-hidden
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-background/60 via-background/30 to-transparent z-[2]" />

        {/* Honeycomb positioned badges starting from bottom-right */}
        <div className="absolute inset-0 z-[1]">
          {icons.map((src, i) => {
            const pos = honeycombPositions[i];
            if (!pos) return null;

            // Honeycomb spacing calculations
            const hexW = 20; // 1.25rem in pixels
            const hexH = 23; // 1.44rem in pixels
            const hexSpacingX = hexW * 0.75; // Horizontal spacing between hex centers
            const hexSpacingY = hexH * 0.87; // Vertical spacing between hex centers

            // Calculate position with proper honeycomb offset
            const isOddRow = pos.y % 2 !== 0;
            const translateX =
              pos.x * hexSpacingX + (isOddRow ? hexSpacingX / 2 : 0);
            const translateY = pos.y * hexSpacingY;

            return (
              <div
                key={`badge-${i}`}
                className="
                  absolute bottom-4 right-4 w-[var(--hexW)] h-[var(--hexH)]
                  [clip-path:polygon(25%_6.7%,75%_6.7%,100%_50%,75%_93.3%,25%_93.3%,0%_50%)]
                  overflow-hidden bg-foreground/5 backdrop-blur-[1px]
                "
                style={{
                  transform: `translate(${translateX}px, ${translateY}px)`,
                }}
              >
                <img
                  src={src}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover scale-110"
                />
                <div className="absolute inset-0 blur-[1.5px]" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Foreground content */}
      <div className="relative z-10 h-full p-2 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          {/* Left: name + gradient applied directly to chatTag */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="min-w-0 leading-tight">
              <div className="flex items-center gap-1 ml-2">
                <div
                  className="text-xl font-semibold truncate"
                  style={gradientStyle}
                >
                  {me.chatTag || me.volunteerId || 'Volunteer'}
                </div>
                {session?.user?.id && isUserAdmin(session.user.id) && (
                  <Shield className="w-4 h-4 text-white flex-shrink-0" />
                )}
              </div>
              <div className="text-xs truncate ml-2">
                <span className="v">Level {me.level}</span>
                {' ~ '}
                <span className="v">Connections {me.connections ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Right: XP */}
          <div className="text-lg shrink-0 mr-2 mt-[8px]">{me.xp} XP</div>
        </div>

        <div className="space-y-1">
          <div className="h-1.5 w-full rounded bg-muted/70 overflow-hidden">
            <div
              className="h-full bg-white"
              style={{ width: `${ratioPct}%` }}
            />
          </div>
          <div className="text-xs leading-none truncate ml-1">{nextLabel}</div>
        </div>

        <div className="flex-1" />
      </div>
    </Card>
  );
}
