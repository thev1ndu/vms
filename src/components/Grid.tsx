'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import StableDialog from '@/components/StableDialog';

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function AchievementsGrid() {
  const { data } = useSWR<{
    badges: Array<{
      _id: string;
      name: string;
      icon?: string;
      description?: string;
      earned: boolean;
    }>;
  }>('/api/badges/grid', fetcher, { refreshInterval: 5000 });

  const [selectedBadge, setSelectedBadge] = useState<{
    _id: string;
    name: string;
    icon?: string;
    description?: string;
  } | null>(null);

  const badges = data?.badges || [];

  return (
    <Card className="bg-transparent border-2 border-[#A5D8FF] rounded-none">
      <CardContent>
        {badges.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No badges defined yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {badges.map((b) => (
              <button
                key={b._id}
                className={`flex flex-col items-center gap-2 p-3 rounded-none border-2 transition ${
                  b.earned ? 'opacity-100' : 'opacity-60'
                } hover:opacity-100`}
                title={b.name}
                onClick={() =>
                  setSelectedBadge({
                    _id: b._id,
                    name: b.name,
                    icon: b.icon,
                    description: b.description,
                  })
                }
              >
                {b.icon ? (
                  <img
                    src={b.icon}
                    alt={b.name}
                    className="h-12 w-12 object-contain"
                  />
                ) : (
                  <div className="h-12 w-12 grid place-items-center text-2xl">
                    🏅
                  </div>
                )}
                <div className="text-sm text-white text-center">{b.name}</div>
              </button>
            ))}
          </div>
        )}
      </CardContent>

      {/* StableDialog for badge details */}
      {selectedBadge && (
        <StableDialog
          open={!!selectedBadge}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedBadge(null);
            }
          }}
          title={selectedBadge.name}
          contentClassName="sm:max-w-md max-h-[70vh] border-2 border-[#A5D8FF] bg-[#000000] rounded-none overflow-hidden flex flex-col"
          headerClassName="p-0"
          titleClassName="mx-auto w-[90%] bg-[#C49799] j text-xl text-black text-center py-3 mb-4"
        >
          <div className="flex flex-col p-4 space-y-4 flex-1 min-h-0">
            <div className="flex items-center justify-center">
              {selectedBadge.icon ? (
                <img
                  src={selectedBadge.icon}
                  alt={selectedBadge.name}
                  className="h-16 w-16 object-contain"
                />
              ) : (
                <div className="h-16 w-16 grid place-items-center text-4xl">
                  🏅
                </div>
              )}
            </div>

            <div className="text-center">
              <p className="text-sm text-white">
                {selectedBadge.description || 'No description available'}
              </p>
            </div>
          </div>
        </StableDialog>
      )}
    </Card>
  );
}
