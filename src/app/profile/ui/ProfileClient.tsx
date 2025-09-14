'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Shield } from 'lucide-react';
import useSWR from 'swr';

const fetcher = (u: string) => fetch(u).then((r) => r.json());

type ChatTagInfo = {
  chatTag: string | null;
  canUpdate: boolean;
  isAdmin: boolean;
  lastUpdateTime: string | null;
  nextUpdateTime: string | null;
};

export default function ProfileClient() {
  const [newChatTag, setNewChatTag] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const { data: chatTagInfo, mutate } = useSWR<ChatTagInfo>(
    '/api/profile/chat-tag',
    fetcher,
    { refreshInterval: 10000 }
  );

  useEffect(() => {
    if (chatTagInfo?.chatTag) {
      setNewChatTag(chatTagInfo.chatTag);
    }
  }, [chatTagInfo]);

  const handleUpdateChatTag = async () => {
    if (!newChatTag.trim()) {
      setMessage({ type: 'error', text: 'Please enter a nickname' });
      return;
    }

    setIsUpdating(true);
    setMessage(null);

    try {
      const response = await fetch('/api/profile/chat-tag', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatTag: newChatTag.trim() }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: result.message || 'Nickname updated successfully!',
        });
        mutate(); // Refresh the data
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Failed to update nickname',
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
            Nickname Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">
              Current Nickname
            </label>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-white border-[#A5D8FF]">
                {chatTagInfo?.chatTag || 'Not set'}
              </Badge>
              {chatTagInfo?.isAdmin && (
                <Badge
                  variant="outline"
                  className="text-yellow-400 border-yellow-400"
                >
                  <Shield className="w-3 h-3 mr-1" />
                  Admin
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">
              New Nickname
            </label>
            <Input
              value={newChatTag}
              onChange={(e) => setNewChatTag(e.target.value)}
              placeholder="Enter new nickname (single word, 3-16 characters)"
              className="bg-transparent border-2 border-[#A5D8FF] rounded-none text-white"
              disabled={!chatTagInfo?.canUpdate}
            />
            <p className="text-xs text-muted-foreground">
              Must be a single word, 3-16 characters, letters, numbers,
              underscores, and hyphens only
            </p>
          </div>

          {!chatTagInfo?.canUpdate && chatTagInfo?.nextUpdateTime && (
            <Alert className="bg-yellow-900/20 border-yellow-400">
              <Clock className="h-4 w-4" />
              <AlertDescription className="text-yellow-200">
                Nickname can be updated again in:{' '}
                {formatTimeUntilNextUpdate(chatTagInfo.nextUpdateTime)}
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
            onClick={handleUpdateChatTag}
            disabled={
              !chatTagInfo?.canUpdate || isUpdating || !newChatTag.trim()
            }
            className="w-full bg-[#A5D8FF] hover:bg-[#A5D8FF] text-black rounded-none cursor-pointer text-lg"
          >
            {isUpdating ? 'Updating...' : 'Update Nickname'}
          </Button>
        </CardContent>
      </Card>

      {/* Info Section */}
      <Card className="bg-transparent border-2 border-[#A5D8FF] rounded-none text-white">
        <CardHeader>
          <CardTitle>Nickname Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-muted-foreground">
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-[#A5D8FF] rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm">Nicknames must be 3-16 characters long</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-[#A5D8FF] rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm">Must be a single word (no spaces allowed)</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-[#A5D8FF] rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm">
              Can contain letters, numbers, underscores, and hyphens
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-[#A5D8FF] rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm">
              Will be converted to lowercase automatically
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-[#A5D8FF] rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm">
              Regular users can update once per 24 hours
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-[#A5D8FF] rounded-full mt-2 flex-shrink-0" />
            <p className="text-sm">Admins can update anytime</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
