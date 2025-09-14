'use client';
import useSWR from 'swr';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { levelGradient } from '@/lib/gradients';
import UserBadgeDialog from '@/components/UserBadgeDialog';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { Shield } from 'lucide-react';
import { useSession } from '@/lib/auth-client';

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

type MentionUser = {
  authUserId: string;
  chatTag: string;
  volunteerId: string;
  level: number;
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

  // session for admin check
  const { data: session } = useSession();

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

  // expanded messages state
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(
    new Set()
  );

  // mention users state
  const [mentionUsers, setMentionUsers] = useState<MentionUser[]>([]);

  // admin users state
  const [adminUsers, setAdminUsers] = useState<Set<string>>(new Set());

  // initial load (latest) - no automatic polling
  const { data } = useSWR<{ messages: Msg[] }>(
    '/api/chat/global/messages?limit=1000',
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  // fetch mention users
  const { data: mentionsData } = useSWR<{ mentions: MentionUser[] }>(
    '/api/chat/mentions',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  useEffect(() => {
    if (mentionsData?.mentions) {
      setMentionUsers(mentionsData.mentions);
    }
  }, [mentionsData]);

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

  // Check if a user is admin
  const isUserAdmin = (authUserId: string) => {
    return adminUsers.has(authUserId);
  };

  // Message truncation constants
  const MAX_MESSAGE_LENGTH = 200;
  const MAX_LINES = 5;

  const shouldTruncateMessage = (message: string) => {
    return (
      message.length > MAX_MESSAGE_LENGTH ||
      message.split('\n').length > MAX_LINES
    );
  };

  const toggleMessageExpansion = (messageId: string) => {
    setExpandedMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  // Parse mentions in text
  const parseMentions = (text: string) => {
    // Create a map of chatTags to users for quick lookup
    const chatTagMap = new Map<string, MentionUser>();
    mentionUsers.forEach((user) => {
      chatTagMap.set(user.chatTag.toLowerCase(), user);
    });

    // Split text by URLs first, then by mentions
    const urlParts = text.split(/(https?:\/\/[^\s]+)/g);

    return urlParts.map((urlPart, urlIndex) => {
      if (urlPart.match(/^https?:\/\/[^\s]+$/)) {
        return (
          <a
            key={`url-${urlIndex}`}
            href={urlPart}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline break-all"
          >
            {urlPart}
          </a>
        );
      }

      // Split by mentions (@chatTag) - single words only, max 16 chars, case-insensitive
      const mentionParts = urlPart.split(
        /(@[A-Za-z0-9][A-Za-z0-9_-]{1,14}[A-Za-z0-9])/g
      );

      return mentionParts.map((mentionPart, mentionIndex) => {
        if (mentionPart.startsWith('@')) {
          const chatTag = mentionPart.substring(1);
          const user = chatTagMap.get(chatTag.toLowerCase());

          if (user) {
            return (
              <button
                key={`mention-${urlIndex}-${mentionIndex}`}
                onClick={() =>
                  handleUsernameClick(user.authUserId, user.chatTag)
                }
                className="text-yellow-400 hover:text-yellow-300 font-medium cursor-pointer"
              >
                {mentionPart}
              </button>
            );
          } else {
            // Mention not found, show as regular text
            return (
              <span
                key={`mention-${urlIndex}-${mentionIndex}`}
                className="text-gray-400"
              >
                {mentionPart}
              </span>
            );
          }
        }
        return mentionPart;
      });
    });
  };

  const renderMessageContent = (message: Msg) => {
    const isExpanded = expandedMessages.has(message._id);
    const shouldTruncate = shouldTruncateMessage(message.body);

    let displayText = message.body;
    if (shouldTruncate && !isExpanded) {
      // Truncate to MAX_MESSAGE_LENGTH characters or MAX_LINES lines, whichever is shorter
      const lines = message.body.split('\n');
      if (lines.length > MAX_LINES) {
        displayText = lines.slice(0, MAX_LINES).join('\n');
      } else if (message.body.length > MAX_MESSAGE_LENGTH) {
        displayText = message.body.substring(0, MAX_MESSAGE_LENGTH);
      }
    }

    return (
      <div className="whitespace-pre-wrap text-sm mt-0.5 break-words overflow-wrap-anywhere">
        {parseMentions(displayText)}
        {shouldTruncate && !isExpanded && (
          <span className="text-gray-400">...</span>
        )}
        {shouldTruncate && (
          <button
            onClick={() => toggleMessageExpansion(message._id)}
            className="ml-2 text-blue-400 hover:text-blue-300 underline text-xs"
          >
            {isExpanded ? 'show less' : 'view more'}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="h-[67vh] flex flex-col bg-black border-2 border-[#9FFF82] rounded-none">
      {/* Messages container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-3"
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
                className="rounded border p-2 bg-transparent border-2 border-[#A5D8FF] rounded-none text-white text-sm max-w-full"
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="text-sm text-gray-400">
                    <span className="inline-flex items-center gap-1">
                      <button
                        onClick={() =>
                          handleUsernameClick(
                            m.senderAuthUserId,
                            m.senderDisplay
                          )
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
                      </button>
                      {isUserAdmin(m.senderAuthUserId) && (
                        <Shield className="w-3 h-3 text-white flex-shrink-0" />
                      )}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(m.createdAt).toLocaleString()}
                  </div>
                </div>
                {renderMessageContent(m)}
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
