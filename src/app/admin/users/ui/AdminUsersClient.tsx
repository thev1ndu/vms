'use client';

import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Search,
  Edit3,
  UserCheck,
  UserX,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Shield,
  User,
  Cog,
  Tag,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import StableDialog from '@/components/StableDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

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
  categoryPreferences?: string[];
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

function UserCard({
  user,
  onApprove,
  onSuspend,
  onSetTag,
  onDelete,
  onUpdatePreferences,
  availableCategories,
}: {
  user: AdminUser;
  onApprove: (id: string, email?: string) => void;
  onSuspend: (id: string, email?: string) => void;
  onSetTag: (id: string, tag: string) => Promise<void>;
  onDelete: (id: string, email?: string) => Promise<void>;
  onUpdatePreferences: (id: string, preferences: string[]) => Promise<void>;
  availableCategories: any[];
}) {
  const [editTagOpen, setEditTagOpen] = useState(false);
  const [tag, setTag] = useState(user.displayName || '');
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
  const [loadingPreferences, setLoadingPreferences] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (categoryName: string) => {
    const category = availableCategories.find(
      (cat) => cat.name === categoryName
    );
    return category?.color || '#A5D8FF'; // Default color if not found
  };

  const getRoleIcon = (role: string) => {
    return role === 'admin' ? (
      <Shield className="w-4 h-4" />
    ) : (
      <User className="w-4 h-4" />
    );
  };

  const getInitials = (name: string, email: string) => {
    if (name && name !== email) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const loadUserPreferences = async () => {
    setLoadingPreferences(true);
    try {
      const response = await fetch(
        `/api/admin/users/${user.authUserId}/preferences`
      );
      const data = await response.json();
      if (response.ok) {
        setSelectedPreferences(data.user.categoryPreferences || []);
      } else {
        alert(data.error || 'Failed to load preferences');
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      alert('Failed to load preferences');
    } finally {
      setLoadingPreferences(false);
    }
  };

  const handlePreferencesOpen = async () => {
    setPreferencesOpen(true);
    await loadUserPreferences();
  };

  const handlePreferenceChange = (categoryName: string, checked: boolean) => {
    if (checked) {
      setSelectedPreferences((prev) => [...prev, categoryName]);
    } else {
      setSelectedPreferences((prev) =>
        prev.filter((name) => name !== categoryName)
      );
    }
  };

  const handleSavePreferences = async () => {
    try {
      await onUpdatePreferences(user.authUserId, selectedPreferences);
      setPreferencesOpen(false);
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  return (
    <Card className="hover:shadow-md rounded-none transition-shadow h-[10vh] relative">
      {/* Card Header with Joined Date */}
      {user.createdAt && (
        <div className="absolute top-1 right-2 text-xs text-muted-foreground z-10">
          Joined: {formatDate(user.createdAt)}
        </div>
      )}

      <CardContent className="p-2 h-full">
        <div className="flex items-center justify-between h-full">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1 mb-0.5">
              <h3 className="font-semibold text-sm truncate">
                {user.name || 'Volunteer'}{' '}
                {user.displayName && (
                  <Badge className="text-xs px-1 py-0 rounded-none">
                    {user.displayName}
                  </Badge>
                )}
              </h3>
            </div>

            <p className="text-xs text-muted-foreground truncate mb-0.5">
              {user.email}
            </p>

            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <span>ROLE: {user.role.toUpperCase()}</span>
              {user.volunteerId && <span> ID: {user.volunteerId}</span>}
              <span>
                LEVEL {user.level} • {user.xp}XP
              </span>
            </div>

            {/* Category Preferences Display */}
            {user.categoryPreferences &&
              user.categoryPreferences.length > 0 && (
                <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                  <span>PREFERENCES:</span>
                  <div className="flex flex-wrap gap-1">
                    {user.categoryPreferences.map((category, index) => (
                      <Badge
                        key={index}
                        className="text-xs py-[-10px] rounded-none bg-[#000000]"
                        style={{ color: getCategoryColor(category) }}
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
          </div>

          <div className="flex items-center space-x-1">
            <Badge
              className={`${getStatusColor(
                user.status
              )} text-xs px-1 py-0 rounded-none`}
            >
              {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Cog className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-none">
                {user.status !== 'approved' ? (
                  <>
                    <DropdownMenuItem
                      onClick={() => onApprove(user.authUserId, user.email)}
                    >
                      <UserCheck className="w-4 h-4 mr-2" />
                      Approve
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onSuspend(user.authUserId, user.email)}
                    >
                      <UserX className="w-4 h-4 mr-2" />
                      Suspend
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => setEditTagOpen(true)}>
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit Display Name
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handlePreferencesOpen}>
                      <Tag className="w-4 h-4 mr-2" />
                      Edit Preferences
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onSuspend(user.authUserId, user.email)}
                    >
                      <UserX className="w-4 h-4 mr-2" />
                      Suspend
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem
                  onClick={() => onDelete(user.authUserId, user.email)}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>

      {/* Edit Display Name Dialog */}
      <StableDialog
        open={editTagOpen}
        onOpenChange={setEditTagOpen}
        title="EDIT DISPLAY NAME"
        contentClassName="sm:max-w-md border-2 border-[#A5D8FF] bg-[#000000] rounded-none"
        headerClassName="p-0"
        titleClassName="mx-auto w-[90%] bg-[#C49799] j text-xl text-black text-center py-3 mb-4"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-center p-4">
            <div className="w-full">
              <label className="text-sm font-medium text-white block mb-2">
                Display Name
              </label>
              <Input
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="e.g., MediaLead-Jane"
                className="rounded-none text-white placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              onClick={() => setEditTagOpen(false)}
              className="rounded-none order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                await onSetTag(user.authUserId, tag.trim());
                setEditTagOpen(false);
              }}
              className="bg-[#A5D8FF] text-black hover:bg-[#A5D8FF] rounded-none order-1 sm:order-2"
            >
              Save
            </Button>
          </div>
        </div>
      </StableDialog>

      {/* Edit Preferences Dialog */}
      <StableDialog
        open={preferencesOpen}
        onOpenChange={setPreferencesOpen}
        title="EDIT CATEGORY PREFERENCES"
        contentClassName="sm:max-w-md border-2 border-[#A5D8FF] bg-[#000000] rounded-none"
        headerClassName="p-0"
        titleClassName="mx-auto w-[90%] bg-[#C49799] j text-xl text-black text-center py-3 mb-4"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-center p-4">
            <div className="w-full">
              <label className="text-sm font-medium text-white block mb-3">
                Select preferred task categories for {user.name || 'this user'}:
              </label>

              {loadingPreferences ? (
                <div className="text-center text-white">
                  Loading categories...
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {availableCategories.map((category) => (
                    <div
                      key={category._id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`category-${category._id}`}
                        checked={selectedPreferences.includes(category.name)}
                        onCheckedChange={(checked) =>
                          handlePreferenceChange(
                            category.name,
                            checked as boolean
                          )
                        }
                        className="rounded-none"
                      />
                      <label
                        htmlFor={`category-${category._id}`}
                        className="text-sm text-white flex items-center space-x-2 cursor-pointer"
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span>{category.name}</span>
                        {category.description && (
                          <span className="text-xs text-gray-400">
                            - {category.description}
                          </span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              onClick={() => setPreferencesOpen(false)}
              className="rounded-none order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePreferences}
              disabled={loadingPreferences}
              className="bg-[#A5D8FF] text-black hover:bg-[#A5D8FF] rounded-none order-1 sm:order-2"
            >
              {loadingPreferences ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </div>
      </StableDialog>
    </Card>
  );
}

export default function AdminUsersClient() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);

  const { data, error, isLoading, mutate } = useSWR<{
    users: AdminUser[];
    pagination: PaginationData;
  }>(
    `/api/admin/users?page=${page}&limit=10&search=${encodeURIComponent(
      search
    )}&status=${statusFilter}&category=${encodeURIComponent(categoryFilter)}`,
    fetcher
  );

  const users = data?.users ?? [];
  const pagination = data?.pagination;

  // Fetch available categories
  const { data: categoriesData } = useSWR('/api/admin/categories', fetcher);
  React.useEffect(() => {
    if (categoriesData?.categories) {
      setAvailableCategories(categoriesData.categories);
    }
  }, [categoriesData]);

  // Debug: Log user data
  console.log('Users received in AdminUsersClient:', users.length);
  users.forEach((user) => {
    console.log(`User ${user.authUserId}:`, {
      categoryPreferences: user.categoryPreferences,
      hasPreferences: !!user.categoryPreferences,
      preferencesLength: user.categoryPreferences?.length || 0,
    });
  });

  async function approve(authUserId: string, email?: string) {
    const res = await fetch('/api/admin/approve-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authUserId, email, status: 'approved' }),
    });
    const j = await res.json();
    if (!res.ok) return alert(j.error || 'Approve failed');
    mutate();
  }

  async function suspend(authUserId: string, email?: string) {
    const res = await fetch('/api/admin/approve-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authUserId, email, status: 'suspended' }),
    });
    const j = await res.json();
    if (!res.ok) return alert(j.error || 'Suspend failed');
    mutate();
  }

  async function setTag(authUserId: string, displayName: string) {
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName }),
    });
    const j = await res.json();
    if (!res.ok) return alert(j.error || 'Failed to set display name');
    mutate();
  }

  async function deleteUser(authUserId: string, email?: string) {
    const res = await fetch('/api/admin/users/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authUserId, email }),
    });

    const j = await res.json();
    if (!res.ok) {
      alert(j.error || 'Failed to delete user');
      return;
    }

    alert('User deleted successfully');
    mutate();
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  }

  async function updatePreferences(authUserId: string, preferences: string[]) {
    const res = await fetch(`/api/admin/users/${authUserId}/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryPreferences: preferences }),
    });

    const j = await res.json();
    if (!res.ok) {
      alert(j.error || 'Failed to update preferences');
      return;
    }

    alert('Preferences updated successfully');
    mutate();
  }

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1); // Reset to first page when searching
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(1); // Reset to first page when filtering
  };

  const handleCategoryFilter = (value: string) => {
    setCategoryFilter(value);
    setPage(1); // Reset to first page when filtering
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      {/* <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <Button onClick={() => mutate()} variant="outline">
          Refresh
        </Button>
      </div> */}
      {/* User Statistics */}
      <div className="flex flex-wrap gap-4 mb-4 text-sm">
        <span className="text-muted-foreground">
          ~ Approved Users:{' '}
          {users.filter((u) => u.status === 'approved').length}
        </span>
        <span className="text-muted-foreground">
          ~ Pending Users: {users.filter((u) => u.status === 'pending').length}
        </span>
        <span className="text-muted-foreground">
          ~ Suspended Users:{' '}
          {users.filter((u) => u.status === 'suspended').length}
        </span>
      </div>
      {/* Search and Filters */}
      <Card className="bg-transparent border-2 border-[#A5D8FF] rounded-none text-white">
        <CardContent className="p-4">
          <div className="flex flex-col space-y-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by name, email, display name, or volunteer ID..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 rounded-none"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger className="w-full sm:w-48 rounded-none">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={categoryFilter}
                onValueChange={handleCategoryFilter}
              >
                <SelectTrigger className="w-full sm:w-48 rounded-none">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="none">No Preferences</SelectItem>
                  {availableCategories.map((category) => (
                    <SelectItem key={category._id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card className="bg-transparent border-2 border-[#A5D8FF] rounded-none text-white">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {pagination && (
              <span className="text-sm font-normal text-muted-foreground">
                {pagination.total} total users
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              Loading users...
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-red-600">
              Error loading users: {String(error.message || error)}
            </div>
          )}

          {!isLoading && !error && users.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {search || statusFilter
                ? 'No users found matching your criteria'
                : 'No users found'}
            </div>
          )}

          {!isLoading && !error && users.length > 0 && (
            <>
              <div className="space-y-4">
                {users.map((user) => (
                  <UserCard
                    key={user.authUserId}
                    user={user}
                    onApprove={approve}
                    onSuspend={suspend}
                    onSetTag={setTag}
                    onDelete={async (id, email) => {
                      setUserToDelete({ ...user, email });
                      setDeleteDialogOpen(true);
                    }}
                    onUpdatePreferences={updatePreferences}
                    availableCategories={availableCategories}
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
                    of {pagination.total} users
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
                                  ? 'bg-[#A5D8FF] hover:bg-[#A5D8FF]text-black border-[#A5D8FF]'
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

      {/* Delete Confirmation Dialog */}
      <StableDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="DELETE USER"
        contentClassName="sm:max-w-md border-2 border-[#A5D8FF] bg-[#000000] rounded-none"
        headerClassName="p-0"
        titleClassName="mx-auto w-[90%] bg-[#C49799] j text-xl text-black text-center py-3 mb-4"
      >
        <div className="space-y-4">
          {/* User Card Preview */}
          {userToDelete && (
            <div className="p-4 bg-white rounded-none w-3/4 mx-auto">
              <div className="text-sm space-y-1">
                <div className="font-semibold text-black">
                  {userToDelete.name || 'Volunteer'}{' '}
                  {userToDelete.displayName && (
                    <Badge className="text-xs px-1 py-0 rounded-none">
                      {userToDelete.displayName}
                    </Badge>
                  )}
                </div>
                <div className="text-gray-600">{userToDelete.email}</div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-center p-4">
            <div className="text-sm text-white text-center space-y-2">
              <p>
                Are you sure you want to delete this user? This action will
                permanently remove: User account and profile data, all task
                participations, all chat messages, all connections with other
                users, and all conversation history.
              </p>
              <p className="font-semibold">This action cannot be undone.</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              onClick={() => setDeleteDialogOpen(false)}
              className="rounded-none order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                userToDelete &&
                deleteUser(userToDelete.authUserId, userToDelete.email)
              }
              className="rounded-none order-1 sm:order-2"
            >
              Delete User
            </Button>
          </div>
        </div>
      </StableDialog>
    </div>
  );
}
