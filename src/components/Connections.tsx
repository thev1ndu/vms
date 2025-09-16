'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  Users,
  Calendar,
  UserCheck,
} from 'lucide-react';
import UserBadgeDialog from '@/components/UserBadgeDialog';

type ConnectedUser = {
  authUserId: string;
  displayName?: string | null;
  volunteerId?: string | null;
  level: number;
  xp: number;
  badgesCount: number;
};

type Connection = {
  connectionId: string;
  otherUser: ConnectedUser;
  createdAt: string;
  createdBy: string;
  wasCreatedByMe: boolean;
};

type PaginationData = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'same-origin' });
  const j = await res.json();
  if (!res.ok) throw new Error(j?.error || 'Failed to load');
  return j;
};

function ConnectionCard({
  connection,
  onUserNameClick,
}: {
  connection: Connection;
  onUserNameClick: (authUserId: string, displayName: string) => void;
}) {
  const { otherUser, createdAt, wasCreatedByMe } = connection;

  const getInitials = (
    displayName?: string | null,
    volunteerId?: string | null
  ) => {
    if (displayName) {
      return displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (volunteerId) {
      return volunteerId.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Card className="hover:shadow-md transition-shadow rounded-none">
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3
              className="font-semibold text-sm truncate cursor-pointer hover:text-[#000000] transition-colors"
              onClick={() =>
                onUserNameClick(
                  otherUser.authUserId,
                  otherUser.displayName || otherUser.volunteerId || 'Volunteer'
                )
              }
            >
              {otherUser.displayName || otherUser.volunteerId || 'Volunteer'}
            </h3>
            <div className="text-[10px] text-muted-foreground mt-1">
              <span>Connected on {formatDate(createdAt)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Connections() {
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    authUserId: string;
    displayName: string;
  } | null>(null);
  const limit = 20;

  const { data, error, isLoading, mutate } = useSWR<{
    connections: Connection[];
    pagination: PaginationData;
  }>(`/api/connections?page=${page}&limit=${limit}`, fetcher);

  const connections = data?.connections ?? [];
  const pagination = data?.pagination;

  const handleUserNameClick = (authUserId: string, displayName: string) => {
    setSelectedUser({ authUserId, displayName });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      {pagination && (
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <span>Total Connections: {pagination.total}</span>
        </div>
      )}

      {/* Connections List */}
      <Card className="bg-transparent border-2 border-[#A5D8FF] rounded-none text-white">
        <CardContent className="space-y-4">
          {isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              Loading connections...
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-red-600">
              Error loading connections: {String(error.message || error)}
            </div>
          )}

          {!isLoading && !error && connections.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No connections yet</p>
              <p className="text-sm">Start connecting with other volunteers!</p>
            </div>
          )}

          {!isLoading && !error && connections.length > 0 && (
            <>
              <div className="space-y-3">
                {connections.map((connection) => (
                  <ConnectionCard
                    key={connection.connectionId}
                    connection={connection}
                    onUserNameClick={handleUserNameClick}
                  />
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.total
                    )}{' '}
                    of {pagination.total} connections
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={!pagination.hasPrev}
                      className="rounded-none hover:bg-transparent hover:text-current"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <div className="flex items-center space-x-1">
                      {Array.from(
                        { length: Math.min(5, pagination.totalPages) },
                        (_, i) => {
                          const pageNum =
                            Math.max(
                              1,
                              Math.min(
                                pagination.totalPages - 4,
                                pagination.page - 2
                              )
                            ) + i;
                          return (
                            <Button
                              key={pageNum}
                              variant="outline"
                              size="sm"
                              onClick={() => setPage(pageNum)}
                              className={`w-8 h-8 p-0 rounded-none ${
                                pageNum === pagination.page
                                  ? 'bg-[#A5D8FF] hover:bg-[#A5D8FF] text-black border-[#A5D8FF]'
                                  : ''
                              }`}
                            >
                              {pageNum}
                            </Button>
                          );
                        }
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={!pagination.hasNext}
                      className="rounded-none hover:bg-transparent hover:text-current"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* User Badge Dialog */}
      {selectedUser && (
        <UserBadgeDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          authUserId={selectedUser.authUserId}
          displayName={selectedUser.displayName}
        />
      )}
    </div>
  );
}
