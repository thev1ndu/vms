'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import UserBadgeDialog from '@/components/UserBadgeDialog';

const fetcher = (u: string) => fetch(u).then((r) => r.json());

type Row = {
  rank: number;
  authUserId: string;
  name: string | null;
  volunteerId: string | null;
  chatTag: string | null;
  level: number;
  xp: number;
  badgesCount: number;
  connectionsCount: number;
};

export default function LeaderboardClient() {
  const { data, mutate, isLoading } = useSWR<{
    rows: Row[];
    me: Row;
    total: number;
  }>('/api/leaderboard?limit=100', fetcher, {
    refreshInterval: 15000,
  });

  const [selectedUser, setSelectedUser] = useState<{
    authUserId: string;
    displayName: string;
  } | null>(null);

  const rows = data?.rows || [];
  const me = data?.me;

  return (
    <div className="space-y-4 text-white text-lg">
      <div className="flex flex-row items-center justify-between">
        {/* <Button variant="secondary" onClick={() => mutate()}>
          {isLoading ? 'Loading…' : 'Refresh'}
        </Button> */}
      </div>

      <Table className="text-base">
        <TableHeader>
          <TableRow className="text-white hover:bg-transparent text-base">
            <TableHead className="w-24 text-white hover:bg-transparent">
              #
            </TableHead>
            <TableHead className="text-white hover:bg-transparent">
              Name
            </TableHead>
            <TableHead className="text-white hover:bg-transparent">
              Level
            </TableHead>
            <TableHead className="text-white hover:bg-transparent">
              XP
            </TableHead>
            <TableHead className="text-white hover:bg-transparent">
              Badges
            </TableHead>
            <TableHead className="text-white hover:bg-transparent">
              Connections
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center text-muted-foreground"
              >
                No data yet
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => {
              const isMe = me && r.authUserId === me.authUserId;
              const displayName =
                r.chatTag || r.volunteerId || r.name || 'Volunteer';
              return (
                <TableRow
                  key={r.authUserId}
                  className={`cursor-pointer ${
                    isMe
                      ? 'bg-[#9FFF82] text-black hover:bg-[#9FFF82]'
                      : 'hover:bg-gray-800'
                  }`}
                  onClick={() =>
                    setSelectedUser({
                      authUserId: r.authUserId,
                      displayName: displayName,
                    })
                  }
                >
                  <TableCell className="font-medium">{r.rank}</TableCell>
                  <TableCell className="font-medium">{displayName}</TableCell>
                  <TableCell>Level {r.level}</TableCell>
                  <TableCell>{r.xp}</TableCell>
                  <TableCell>{r.badgesCount}</TableCell>
                  <TableCell>{r.connectionsCount}</TableCell>
                </TableRow>
              );
            })
          )}

          {/* If user not in top rows, still show */}
          {me && !rows.some((r) => r.authUserId === me.authUserId) && (
            <TableRow
              className="bg-muted/40 cursor-pointer hover:bg-muted/60"
              onClick={() =>
                setSelectedUser({
                  authUserId: me.authUserId,
                  displayName: me.chatTag || me.volunteerId || me.name || 'You',
                })
              }
            >
              <TableCell className="w-12 font-medium">{me.rank}</TableCell>
              <TableCell className="font-medium">
                {me.chatTag || me.volunteerId || me.name || 'You'}
              </TableCell>
              <TableCell>Level {me.level}</TableCell>
              <TableCell>{me.xp}</TableCell>
              <TableCell>{me.badgesCount ?? 0}</TableCell>
              <TableCell>{me.connectionsCount ?? 0}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* UserBadgeDialog */}
      {selectedUser && (
        <UserBadgeDialog
          open={!!selectedUser}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedUser(null);
            }
          }}
          authUserId={selectedUser.authUserId}
          displayName={selectedUser.displayName}
        />
      )}
    </div>
  );
}
