'use client';

import React from 'react';
import useSWR from 'swr';

type AdminUser = {
  authUserId: string;
  email?: string;
  name?: string;
  role: string;
  status: 'pending' | 'approved' | 'suspended';
  volunteerId?: string | null;
  xp: number;
  level: number;
  displayName?: string | null;
  createdAt?: string | null;
};

type UserStats = {
  totalUsers: number;
  approvedUsers: number;
  pendingUsers: number;
  suspendedUsers: number;
  adminUsers: number;
  volunteerUsers: number;
  totalConnections: number;
  averageLevel: number;
  totalXP: number;
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'same-origin' });
  const j = await res.json();
  if (!res.ok) throw new Error(j?.error || 'Failed to load');
  return j;
};

export default function SystemUsersDash() {
  const { data, error, isLoading } = useSWR<{ users: AdminUser[] }>(
    '/api/admin/users?status=all',
    fetcher
  );

  const users = data?.users ?? [];

  // Calculate statistics
  const stats: UserStats = {
    totalUsers: users.length,
    approvedUsers: users.filter((u) => u.status === 'approved').length,
    pendingUsers: users.filter((u) => u.status === 'pending').length,
    suspendedUsers: users.filter((u) => u.status === 'suspended').length,
    adminUsers: users.filter((u) => u.role === 'admin').length,
    volunteerUsers: users.filter((u) => u.role === 'volunteer').length,
    totalConnections: 0, // This would need to be fetched from connections API
    averageLevel:
      users.length > 0
        ? Math.round(users.reduce((sum, u) => sum + u.level, 0) / users.length)
        : 0,
    totalXP: users.reduce((sum, u) => sum + u.xp, 0),
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="space-y-1">
          <div className="text-center py-8 text-gray-400">
            Loading statistics...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6 px-4 bg-red-900/20 border border-red-500 rounded-lg">
        <div className="text-center text-red-400">
          Error loading user statistics: {String(error.message || error)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main Statistics */}
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-white mb-1">
          User Statistics
        </h3>
        <div className="space-y-0">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Total Users</span>
            <span className="text-lg font-bold text-white">
              {stats.totalUsers}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Approved Users</span>
            <span className="text-lg font-bold text-white">
              {stats.approvedUsers}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Pending Users</span>
            <span className="text-lg font-bold text-white">
              {stats.pendingUsers}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Suspended Users</span>
            <span className="text-lg font-bold text-white">
              {stats.suspendedUsers}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Admin Users</span>
            <span className="text-lg font-bold text-white">
              {stats.adminUsers}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Volunteer Users</span>
            <span className="text-lg font-bold text-white">
              {stats.volunteerUsers}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Average Level</span>
            <span className="text-lg font-bold text-white">
              {stats.averageLevel}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Total XP</span>
            <span className="text-lg font-bold text-white">
              {stats.totalXP.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* System Health Summary */}
      <div className="">
        <h3 className="text-base font-semibold text-white mb-1">
          System Health Summary
        </h3>
        <div className="space-y-0.5">
          <div className="flex justify-between">
            <span className="text-sm text-gray-300">Active Users</span>
            <span className="text-lg font-bold text-white">
              {stats.approvedUsers}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-300">Pending Approval</span>
            <span className="text-lg font-bold text-white">
              {stats.pendingUsers}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-300">Suspended</span>
            <span className="text-lg font-bold text-white">
              {stats.suspendedUsers}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
