'use client';
import { useState, useEffect } from 'react';
import StableDialog from '@/components/StableDialog';
import CompactVolunteerCard from '@/components/CompactVolunteerCard';

interface UserBadge {
  slug: string;
  name: string;
  icon: string;
  description: string;
}

interface UserBadgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authUserId: string;
  displayName: string;
}

export default function UserBadgeDialog({
  open,
  onOpenChange,
  authUserId,
  displayName,
}: UserBadgeDialogProps) {
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && authUserId) {
      fetchUserBadges();
    }
  }, [open, authUserId]);

  const fetchUserBadges = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/user/${authUserId}/badges`);
      if (!response.ok) {
        throw new Error('Failed to fetch badges');
      }
      const data = await response.json();
      setBadges(data.badges || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch badges');
    } finally {
      setLoading(false);
    }
  };

  return (
    <StableDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${authUserId}`}
      contentClassName="sm:max-w-md max-h-[70vh] border-2 border-[#A5D8FF] bg-[#000000] rounded-none overflow-hidden flex flex-col"
      headerClassName="p-0"
      titleClassName="mx-auto w-[90%] bg-[#C49799] j text-xl text-black text-center py-3 mb-4"
    >
      <div className="flex flex-col p-4 space-y-4 flex-1 min-h-0">
        {/* Username
        <div className="text-center">
          <p className="text-sm text-white font-medium">{authUserId}</p>
        </div> */}

        {/* Compact Volunteer Card */}
        <div className="w-full flex-shrink-0">
          <CompactVolunteerCard authUserId={authUserId} />
        </div>

        {/* Badges Section */}
        <div className="space-y-4 w-full flex-1 min-h-0 flex flex-col">
          <h3 className="text-lg font-semibold text-white text-center flex-shrink-0">
            Badges
          </h3>
          {loading ? (
            <div className="text-center py-4 flex-1 flex items-center justify-center">
              <p className="text-sm text-white">Loading…</p>
            </div>
          ) : error ? (
            <div className="text-center py-4 flex-1 flex items-center justify-center">
              <p className="text-sm text-white">{error}</p>
            </div>
          ) : badges.length === 0 ? (
            <div className="text-center py-4 flex-1 flex items-center justify-center">
              <p className="text-sm text-white">No badges earned yet</p>
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
              {badges.map((badge) => (
                <div
                  key={badge.slug}
                  className="flex items-start gap-3 p-2 rounded-none border-1 border-[#A5D8FF] bg-transparent"
                >
                  <div className="flex-shrink-0">
                    {badge.icon ? (
                      <img
                        src={badge.icon}
                        alt={badge.name}
                        className="h-8 w-8 rounded-none mt-1 object-cover"
                        onError={(e) => {
                          // Fallback to emoji or default icon
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div
                      className={`h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm ${
                        badge.icon ? 'hidden' : ''
                      }`}
                    >
                      🏆
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate mb-1 text-white">
                      {badge.name}
                    </h4>
                    <p className="text-xs text-white line-clamp-2">
                      {badge.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </StableDialog>
  );
}
