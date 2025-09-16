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
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const { data: displayNameInfo, mutate } = useSWR<DisplayNameInfo>(
    '/api/profile/display-name',
    fetcher,
    { refreshInterval: 10000 }
  );

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

    // Check if display name contains any spaces
    if (trimmedName.includes(' ')) {
      setMessage({
        type: 'error',
        text: 'Display name cannot contain spaces',
      });
      return;
    }

    // Check character length (2-16 characters)
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
        mutate(); // Refresh the data
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Failed to update display name',
        });
      }
    } catch (error) {
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

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  return (
    <div className="grid gap-4">
      {/* Nickname Section */}
      <Card className="bg-transparent border-2 border-[#A5D8FF] rounded-none text-white">
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

      {/* Info Section */}
      <Card className="bg-transparent border-2 border-[#A5D8FF] rounded-none text-white">
        <CardHeader>
          <CardTitle>Display Name Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-muted-foreground">
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-[#A5D8FF] rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm">Must be 2-16 characters long</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-[#A5D8FF] rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm">Cannot contain spaces</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-[#A5D8FF] rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm">
              Used for identification in chat and mentions
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-[#A5D8FF] rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm">Can be updated anytime</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
