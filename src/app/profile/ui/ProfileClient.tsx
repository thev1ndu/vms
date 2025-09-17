'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Clock, User } from 'lucide-react';
import AdminBadge from '@/components/AdminBadge';
import useSWR from 'swr';

const fetcher = (u: string) => fetch(u).then((r) => r.json());

type DisplayNameInfo = {
  displayName: string | null;
  canUpdate: boolean;
  isAdmin: boolean;
  lastUpdateTime: string | null;
  nextUpdateTime: string | null;
};

export default function ProfileClient() {
  const [newDisplayName, setNewDisplayName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const { data: displayNameInfo, mutate } = useSWR<DisplayNameInfo>(
    '/api/profile/display-name',
    fetcher,
    { refreshInterval: 10000 }
  );
  const { data: meData } = useSWR<any>('/api/me', fetcher);

  // ---------- HONEYCOMB HELPERS (no gaps; controllable gutter) ----------
  const generateHoneycombPositions = (count: number) => {
    if (!count) return [] as Array<{ q: number; r: number }>;
    const out: Array<{ q: number; r: number }> = [];
    const seen = new Set<string>();
    const key = (q: number, r: number) => `${q},${r}`;
    const neigh = (q: number, r: number) => [
      { q: q + 1, r },
      { q: q - 1, r },
      { q, r: r + 1 },
      { q, r: r - 1 },
      { q: q + 1, r: r - 1 },
      { q: q - 1, r: r + 1 },
    ];
    const queue = [{ q: 0, r: 0 }];
    while (queue.length && out.length < count) {
      const cur = queue.shift()!;
      const k = key(cur.q, cur.r);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(cur);
      for (const n of neigh(cur.q, cur.r)) queue.push(n);
    }
    return out;
  };

  // pointy-top axial -> pixel (uses SPACING width, not visual width)
  const axialToPixel = (q: number, r: number, spacingW: number) => {
    const spacingH = (Math.sqrt(3) / 2) * spacingW;
    const x = spacingW * 0.75 * q;
    const y = spacingH * (r + q / 2);
    return { x, y, spacingH };
  };
  // ----------------------------------------------------------------------

  useEffect(() => {
    if (displayNameInfo?.displayName) {
      setNewDisplayName(displayNameInfo.displayName);
    }
  }, [displayNameInfo]);

  const handleUpdateDisplayName = async () => {
    const trimmedName = newDisplayName.trim();
    if (!trimmedName) {
      setMessage({ type: 'error', text: 'Please enter a display name' });
      return;
    }
    if (trimmedName.includes(' ')) {
      setMessage({ type: 'error', text: 'Display name cannot contain spaces' });
      return;
    }
    if (trimmedName.length < 2) {
      setMessage({
        type: 'error',
        text: 'Display name must be at least 2 characters long',
      });
      return;
    }
    if (trimmedName.length > 16) {
      setMessage({
        type: 'error',
        text: 'Display name must be 16 characters or less',
      });
      return;
    }

    setIsUpdating(true);
    setMessage(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: trimmedName }),
      });
      const result = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: result.message || 'Display name updated successfully!',
        });
        mutate();
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Failed to update display name',
        });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const formatTimeUntilNextUpdate = (nextUpdateTime: string) => {
    const now = new Date();
    const next = new Date(nextUpdateTime);
    const diffMs = next.getTime() - now.getTime();
    if (diffMs <= 0) return 'Available now';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  // Card chrome: subtle outer ring/offset so each card has visible separation
  const cardChrome =
    'bg-transparent border-2 border-[#A5D8FF] rounded-none text-white ring-1 ring-white/10 ring-offset-2 ring-offset-background';

  return (
    <div className="grid gap-4">
      {/* Display Name Section */}
      <Card className={cardChrome}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Display Name Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">
              Current Display Name
            </label>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-white border-[#A5D8FF]">
                {displayNameInfo?.displayName || 'Not set'}
              </Badge>
              {displayNameInfo?.isAdmin && <AdminBadge />}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">
              New Display Name
            </label>
            <Input
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              placeholder="Enter new display name"
              className="bg-transparent border-2 border-[#A5D8FF] rounded-none text-white"
              disabled={!displayNameInfo?.canUpdate}
            />
            <p className="text-xs text-muted-foreground">
              Display name can be updated anytime
            </p>
          </div>

          {!displayNameInfo?.canUpdate && displayNameInfo?.nextUpdateTime && (
            <Alert className="bg-yellow-900/20 border-yellow-400">
              <Clock className="h-4 w-4" />
              <AlertDescription className="text-yellow-200">
                Display name can be updated again in:{' '}
                {formatTimeUntilNextUpdate(displayNameInfo.nextUpdateTime)}
              </AlertDescription>
            </Alert>
          )}

          {message && (
            <Alert
              className={
                message.type === 'success'
                  ? 'bg-green-900/20 border-green-400'
                  : 'bg-red-900/20 border-red-400'
              }
            >
              <AlertDescription
                className={
                  message.type === 'success' ? 'text-green-200' : 'text-red-200'
                }
              >
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleUpdateDisplayName}
            disabled={
              !displayNameInfo?.canUpdate ||
              isUpdating ||
              !newDisplayName.trim() ||
              newDisplayName.trim().includes(' ') ||
              newDisplayName.trim().length < 2 ||
              newDisplayName.trim().length > 16
            }
            className="w-full bg-[#A5D8FF] hover:bg-[#A5D8FF] text-black rounded-none cursor-pointer text-lg"
          >
            {isUpdating ? 'Updating...' : 'Update Display Name'}
          </Button>
        </CardContent>
      </Card>

      {/* Badges — honeycomb with visual gutter */}
      <Card className={cardChrome}>
        <CardHeader>
          <CardTitle>Badges</CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            if (!meData?.me?.badges?.length) {
              return (
                <p className="text-sm text-muted-foreground">
                  No badges earned yet
                </p>
              );
            }

            const icons = (meData.me.badges || [])
              .map((b: any) => b.icon)
              .filter(Boolean) as string[];

            const positions = generateHoneycombPositions(icons.length);

            // Calculate optimal sizing based on number of badges
            const badgeCount = icons.length;
            let baseSpacingW = 72;
            let minHeight = 200;

            // Scale down for more badges
            if (badgeCount > 12) {
              baseSpacingW = 48;
              minHeight = 180;
            } else if (badgeCount > 8) {
              baseSpacingW = 56;
              minHeight = 160;
            } else if (badgeCount > 4) {
              baseSpacingW = 64;
              minHeight = 140;
            }

            // ---- SIZE & GUTTER ----
            const GUTTER = Math.max(4, baseSpacingW * 0.08); // Scale gutter with size
            const SPACING_W = baseSpacingW;
            const CELL_W = SPACING_W - GUTTER;
            const CELL_H = (Math.sqrt(3) / 2) * CELL_W;
            const BORDER = 2;

            // cluster centering uses the spacing width (not the shrunken visual width)
            const px = positions.map(({ q, r }) =>
              axialToPixel(q, r, SPACING_W)
            );
            const minX = Math.min(...px.map((p) => p.x));
            const maxX = Math.max(...px.map((p) => p.x));
            const minY = Math.min(...px.map((p) => p.y));
            const maxY = Math.max(...px.map((p) => p.y));
            const clusterW = maxX - minX || 1;
            const clusterH = maxY - minY || 1;

            // Calculate dynamic height based on cluster size with padding
            const padding = 40;
            const calculatedHeight = Math.max(minHeight, clusterH + padding);

            return (
              <div
                className="relative w-full overflow-hidden rounded-none flex items-center justify-center"
                style={{ height: `${calculatedHeight}px` }}
                aria-hidden
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-background/60 via-background/30 to-transparent z-[2]" />

                <div className="absolute inset-0 z-[1]">
                  {icons.map((src, i) => {
                    const { q, r } = positions[i];
                    const { x, y } = axialToPixel(q, r, SPACING_W);
                    const nx = x - (minX + clusterW / 2);
                    const ny = y - (minY + clusterH / 2);

                    return (
                      <div
                        key={`badge-${i}`}
                        className="
                          absolute top-1/2 left-1/2 box-border will-change-transform
                          [clip-path:polygon(25%_0%,75%_0%,100%_50%,75%_100%,25%_100%,0%_50%)]
                          overflow-hidden bg-foreground/5 backdrop-blur-[1px]
                          border border-white/30
                          shadow-[0_0_0_1px_rgba(255,255,255,0.08)]
                        "
                        style={
                          {
                            width: `${CELL_W}px`,
                            height: `${CELL_H}px`,
                            borderWidth: `${BORDER}px`,
                            transform: `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`,
                          } as React.CSSProperties
                        }
                      >
                        <img
                          src={src}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover"
                          draggable={false}
                          loading="lazy"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
