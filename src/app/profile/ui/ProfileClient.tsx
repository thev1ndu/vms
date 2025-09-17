'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProfileBadge } from '@/components/ProfileBadge';
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

  // ---------- HEXAGONAL GRID HELPERS (packed flat-topped, no gaps) ----------
  // Build a simple grid of (col,row) slots
  const generateHexGridPositions = (count: number) => {
    if (!count) return [] as Array<{ x: number; y: number }>;
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const positions: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      positions.push({ x: col, y: row });
    }
    return positions;
  };

  // Flat-topped hex packing with spacing:
  // Horizontal center spacing dx = 0.75 * W + spacing
  // Vertical center spacing dy = H + spacing = (√3/2) * W + spacing
  // Odd columns are shifted down by H/2
  const gridToPixel = (col: number, row: number, hexW: number, spacing: number = 8) => {
    const hexH = (Math.sqrt(3) / 2) * hexW;
    const dx = 0.75 * hexW + spacing;
    const x = col * dx;
    const y = row * (hexH + spacing) + ((col & 1) ? (hexH + spacing) / 2 : 0);
    return { x, y, hexH };
  };
  // --------------------------------------------------------------------------

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

  // Card chrome: subtle ring/offset so each card has visible separation
  const cardChrome =
    'bg-transparent border-2 border-[#A5D8FF] rounded-none text-white';

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
              <ProfileBadge variant="outline">
                {displayNameInfo?.displayName || 'Not set'}
              </ProfileBadge>
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

      {/* Badges — gapless hex wall */}
      <Card className={cardChrome}>
        <CardHeader>
          <CardTitle>Badges</CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const icons = (meData?.me?.badges || [])
              .map((b: any) => b?.icon)
              .filter(Boolean) as string[];

            if (!icons.length) {
              return (
                <p className="text-sm text-muted-foreground">
                  No badges earned yet
                </p>
              );
            }

            const positions = generateHexGridPositions(icons.length);

            // Choose a base hex width responsive to count with better spacing
            const badgeCount = icons.length;
            const spacing = 5; // Fixed spacing between badges
            let HEX_W = 60;
            let minHeight = 200;

            if (badgeCount > 15) {
              HEX_W = 40;
              minHeight = 180;
            } else if (badgeCount > 10) {
              HEX_W = 48;
              minHeight = 160;
            } else if (badgeCount > 6) {
              HEX_W = 52;
              minHeight = 150;
            }

            const CELL_W = HEX_W;
            const CELL_H = (Math.sqrt(3) / 2) * CELL_W;

            // Compute centers for centering the cluster with spacing
            const centers = positions.map(({ x, y }) => gridToPixel(x, y, CELL_W, spacing));
            const minX = Math.min(...centers.map((p) => p.x));
            const maxX = Math.max(...centers.map((p) => p.x));
            const minY = Math.min(...centers.map((p) => p.y));
            const maxY = Math.max(...centers.map((p) => p.y));

            // Include proper margins so edges don't clip
            const clusterW = maxX - minX + CELL_W + spacing; // full width + spacing margin
            const clusterH = maxY - minY + CELL_H + spacing; // full height + spacing margin

            const padding = 40; // Increased padding for better visibility
            const calculatedHeight = Math.max(minHeight, clusterH + padding);

            return (
              <div
                className="relative w-full overflow-hidden rounded-none flex items-center justify-center"
                style={{ height: `${calculatedHeight}px` }}
                aria-hidden
              >
                {/* Tile layer */}
                <div className="absolute inset-0">
                  {icons.map((src, i) => {
                    const { x: col, y: row } = positions[i];
                    const { x: cx, y: cy } = gridToPixel(col, row, CELL_W, spacing);

                    // Center the cluster within the container
                    const nx = cx - (minX + clusterW / 2);
                    const ny = cy - (minY + clusterH / 2);

                    return (
                      <div
                        key={`badge-${i}`}
                        className="
                          absolute top-1/2 left-1/2 will-change-transform
                          [clip-path:polygon(25%_0%,75%_0%,100%_50%,75%_100%,25%_100%,0%_50%)]
                          overflow-hidden
                        "
                        style={{
                          width: `${CELL_W}px`,
                          height: `${CELL_H}px`,
                          transform: `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`,
                          // Uncomment to defeat rare sub-pixel hairlines:
                          // transform: `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px)) scale(1.001)`,
                        } as React.CSSProperties}
                      >
                        <img
                          src={src}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover select-none"
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
