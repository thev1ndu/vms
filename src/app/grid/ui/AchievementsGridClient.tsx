'use client';
import useSWR from 'swr';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge as UIBadge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';

const fetcher = (u: string) => fetch(u).then((r) => r.json());

type BadgeItem = {
  _id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  earned: boolean;
};

export default function AchievementsGridClient() {
  const { data } = useSWR<{
    badges: BadgeItem[];
    totals: { earned: number; total: number };
  }>('/api/achievements/grid', fetcher, { refreshInterval: 15000 });

  // Debug: Log the data when it changes
  console.log('AchievementsGridClient: Received data:', data);
  if (data?.badges) {
    console.log(
      'AchievementsGridClient: Badge details:',
      data.badges.map((b) => ({ name: b.name, icon: b.icon, earned: b.earned }))
    );
  }

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'earned' | 'locked'>('all');

  const list = useMemo(() => {
    let arr = data?.badges || [];
    if (filter !== 'all')
      arr = arr.filter((b) => (filter === 'earned' ? b.earned : !b.earned));
    if (query.trim()) {
      const s = query.trim().toLowerCase();
      arr = arr.filter(
        (b) =>
          b.name.toLowerCase().includes(s) || b.slug.toLowerCase().includes(s)
      );
    }
    return arr;
  }, [data?.badges, query, filter]);

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {data
            ? `${data.totals.earned}/${data.totals.total} earned`
            : 'Loading…'}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Search badges…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-[220px]"
          />
          <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="earned">Earned</SelectItem>
              <SelectItem value="locked">Locked</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!list.length ? (
        <div className="text-sm text-muted-foreground">No badges match.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {list.map((b) => (
            <Dialog key={b._id}>
              <DialogTrigger asChild>
                <Card
                  className={
                    'cursor-pointer transition hover:shadow-md ' +
                    (b.earned ? '' : 'opacity-60')
                  }
                  title={b.name}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="truncate">{b.name}</span>
                      {b.earned && (
                        <UIBadge className="ml-2" variant="secondary">
                          Earned
                        </UIBadge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-center p-4">
                    {b.icon ? (
                      // Icon URL (can be PNG/SVG/emoji-as-img)
                      <img
                        src={b.icon}
                        alt={b.name}
                        className="h-16 w-16 object-contain"
                        onError={(e) => {
                          console.log(
                            'Image failed to load:',
                            b.icon,
                            'for badge:',
                            b.name
                          );
                          console.log('Image element:', e.target);
                        }}
                        onLoad={() => {
                          console.log(
                            'Image loaded successfully:',
                            b.icon,
                            'for badge:',
                            b.name
                          );
                        }}
                      />
                    ) : (
                      <div className="text-4xl">🏅</div>
                    )}
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    {b.icon ? (
                      <img
                        src={b.icon}
                        alt={b.name}
                        className="h-8 w-8 object-contain"
                      />
                    ) : (
                      <span className="text-2xl">🏅</span>
                    )}
                    {b.name}
                  </DialogTitle>
                  {!!b.description && (
                    <DialogDescription className="pt-1">
                      {b.description}
                    </DialogDescription>
                  )}
                </DialogHeader>
              </DialogContent>
            </Dialog>
          ))}
        </div>
      )}
    </div>
  );
}
