'use client';
import useSWR from 'swr';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { levelGradient } from '@/lib/gradients';
import UserBadgeDialog from '@/components/UserBadgeDialog';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';

const fetcher = (u: string) => fetch(u).then((r) => r.json());

type Msg = {
  _id: string;
  conversationId: string;
  senderAuthUserId: string;
  senderVolunteerId: string;
  senderDisplay: string;
  senderLevel: number;
  body: string;
  attachments?: { url: string; name?: string; mime?: string }[];
  createdAt: string;
};

function dedupeById(list: Msg[]) {
  const seen = new Set<string>();
  return list.filter((m) =>
    seen.has(m._id) ? false : (seen.add(m._id), true)
  );
}

export default function GlobalChatClient() {
  // message state
  const [messages, setMessages] = useState<Msg[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);

  // composer
  const [sending, setSending] = useState(false);
  const [body, setBody] = useState('');

  // badge dialog state
  const [badgeDialogOpen, setBadgeDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    authUserId: string;
    displayName: string;
  } | null>(null);

  // fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // initial load (latest) - no automatic polling
  const { data } = useSWR<{ messages: Msg[] }>(
    '/api/chat/global/messages?limit=1000',
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  // Real-time message handling
  const handleNewMessage = useCallback((message: Msg) => {
    console.log('New real-time message received:', message);
    setMessages((prev) => {
      // Check if message already exists to avoid duplicates
      if (prev.some((m) => m._id === message._id)) {
        console.log('Message already exists, skipping:', message._id);
        return prev;
      }
      console.log('Adding new message to state:', message._id);
      return dedupeById([...prev, message]);
    });

    // Auto-scroll if near bottom
    const c = containerRef.current;
    if (!c) return;
    const nearBottom = c.scrollHeight - c.scrollTop - c.clientHeight < 120;
    if (nearBottom) {
      setTimeout(() => (c.scrollTop = c.scrollHeight), 0);
    }
  }, []);

  // Use real-time messaging hook
  useRealtimeMessages(handleNewMessage);

  useEffect(() => {
    if (!data?.messages) return;

    // Only update if there are new messages
    setMessages((prev) => {
      const newMessages = data.messages.filter(
        (newMsg) => !prev.some((existingMsg) => existingMsg._id === newMsg._id)
      );

      if (newMessages.length === 0) return prev; // No new messages, don't update

      return dedupeById([...prev, ...newMessages]);
    });
  }, [data?.messages]);

  // Simple polling fallback for real-time updates
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const startPolling = () => {
      interval = setInterval(() => {
        // Only poll if tab is visible
        if (!document.hidden) {
          fetch('/api/chat/global/messages?limit=1000')
            .then((res) => res.json())
            .then((data) => {
              if (data.messages) {
                setMessages((prev) => {
                  const newMessages = data.messages.filter(
                    (newMsg: Msg) =>
                      !prev.some(
                        (existingMsg) => existingMsg._id === newMsg._id
                      )
                  );
                  if (newMessages.length === 0) return prev;
                  return dedupeById([...prev, ...newMessages]);
                });
              }
            })
            .catch((err) => console.error('Polling error:', err));
        }
      }, 3000); // Poll every 3 seconds
    };

    startPolling();

    // Stop polling when tab becomes hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearInterval(interval);
      } else {
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Load older when the top sentinel intersects
  const topRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const loadOlder = useCallback(async () => {
    if (loadingOlder || !hasMore || messages.length === 0) return;
    setLoadingOlder(true);
    const first = messages[0];
    const res = await fetch(
      `/api/chat/global/messages?limit=50&before=${encodeURIComponent(
        new Date(first.createdAt).toISOString()
      )}`
    );
    const j = await res.json();
    const older: Msg[] = j.messages || [];
    if (older.length === 0) setHasMore(false);
    setMessages((prev) => dedupeById([...older, ...prev]));
    setLoadingOlder(false);
  }, [messages, hasMore, loadingOlder]);

  // intersection observer to auto-fetch older
  useEffect(() => {
    const el = topRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            loadOlder();
          }
        }
      },
      {
        root: containerRef.current,
        rootMargin: '200px 0px 0px 0px',
        threshold: 0,
      }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadOlder]);

  // scroll to bottom when initial messages loaded
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    c.scrollTop = c.scrollHeight;
  }, [messages.length === 0]); // first load only

  async function send() {
    const text = body.trim();
    if (!text) return;
    setSending(true);
    const res = await fetch('/api/chat/global/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: text }),
    });
    const j = await res.json();
    setSending(false);
    if (!res.ok) return alert(j.error || 'Send failed');
    setBody('');
    // Optimistic append (SSE will also deliver; dedupe keeps single)
    setMessages((prev) => dedupeById([...prev, j.message as Msg]));
    const c = containerRef.current;
    if (c) setTimeout(() => (c.scrollTop = c.scrollHeight), 0);
  }

  const handleUsernameClick = (authUserId: string, displayName: string) => {
    setSelectedUser({ authUserId, displayName });
    setBadgeDialogOpen(true);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className="h-[60vh] flex flex-col bg-black border-2 border-[#9FFF82] rounded-none">
      {/* Messages container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-3 space-y-3"
        style={{ scrollbarWidth: 'thin' }}
      >
        {/* Top sentinel for infinite older */}
        <div ref={topRef} />
        {messages.length === 0 ? (
          <div className="text-base text-muted-foreground">
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map((m) => {
            const gradient = levelGradient(m.senderLevel);
            return (
              <div
                key={m._id}
                className="rounded border p-2 bg-transparent border-2 border-[#A5D8FF] rounded-none text-white text-sm"
              >
                <div className="text-sm text-gray-400">
                  <button
                    onClick={() =>
                      handleUsernameClick(m.senderAuthUserId, m.senderDisplay)
                    }
                    className="font-medium hover:underline cursor-pointer transition-all"
                    style={{
                      background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {m.senderDisplay}
                  </button>{' '}
                  <span>• {new Date(m.createdAt).toLocaleString()}</span>
                </div>
                <div className="whitespace-pre-wrap text-sm mt-0.5">
                  {m.body.split(/(https?:\/\/[^\s]+)/g).map((part, index) => {
                    if (part.match(/^https?:\/\/[^\s]+$/)) {
                      return (
                        <a
                          key={index}
                          href={part}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline"
                        >
                          {part}
                        </a>
                      );
                    }
                    return part;
                  })}
                </div>
                {!!m.attachments?.length && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {m.attachments!.map((a, i) => (
                      <a
                        key={i}
                        href={a.url}
                        target="_blank"
                        className="text-xs underline"
                      >
                        {a.name || a.url}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
        {/* bottom spacer */}
        <div className="h-1" />
      </div>

      {/* Input area - fixed at bottom */}
      <div className="flex-shrink-0 border-t border-[#9FFF82] flex items-center"></div>
      <div className="flex-shrink-0 p-3 border-t border-[#9FFF82] flex items-center gap-2">
        <Input
          placeholder="Type a message…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="flex-1 bg-transparent border-2 border-[#9FFF82] rounded-none text-white text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <Button
          onClick={send}
          disabled={sending || body.trim().length === 0}
          className="w-16 text-lg bg-[#9FFF82] hover:bg-[#9FFF82] text-black border-2 border-[#9FFF82] rounded-none"
        >
          {sending ? 'Send' : 'Send'}
        </Button>
      </div>

      {/* Badge Dialog */}
      {selectedUser && (
        <UserBadgeDialog
          open={badgeDialogOpen}
          onOpenChange={setBadgeDialogOpen}
          authUserId={selectedUser.authUserId}
          displayName={selectedUser.displayName}
        />
      )}
    </div>
  );
}
