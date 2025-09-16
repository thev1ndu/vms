'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Target,
  MessageSquare,
  GridIcon,
  User,
  Trophy,
  ArrowUpRight,
  Plus,
  Settings,
} from 'lucide-react';
import QRScanButton from './QRScanner';
import Link from 'next/link';
import { useSession } from '@/lib/auth-client';
import './components.css';

export default function Menu() {
  const { data: session } = useSession();
  const isAdmin =
    session?.user &&
    (session.user as any).role === 'admin' &&
    (session.user as any).status === 'approved';

  return (
    <div className="mx-auto w-full h-[60vh]">
      {/* Tiles: always 2 columns */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/me">
          <Card className="w-full h-24 shadow-sm rounded-none bg-transparent border-2 border-[#9FFF82]">
            <CardContent className="flex h-full items-center justify-center gap-2 text-white p-2">
              <ArrowUpRight className="w-5 h-5" /> <br />
              <span className="text-lg leading-tight">Objectives</span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/tasks">
          <Card className="w-full h-24 shadow-sm rounded-none bg-transparent border-2 border-[#9FFF82]">
            <CardContent className="flex h-full items-center justify-center gap-2 text-white p-2">
              <ArrowUpRight className="w-5 h-5" /> <br />
              <span className="text-lg leading-tight">Mission Control</span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/chat">
          <Card className="w-full h-24 shadow-sm rounded-none bg-transparent border-2 border-[#9FFF82]">
            <CardContent className="flex h-full items-center justify-center gap-2 text-white p-2">
              <ArrowUpRight className="w-5 h-5" /> <br />
              <span className="text-lg leading-tight">Global Chat</span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/grid">
          <Card className="w-full h-24 shadow-sm rounded-none bg-transparent border-2 border-[#9FFF82]">
            <CardContent className="flex h-full items-center justify-center gap-2 text-white p-2">
              <ArrowUpRight className="w-5 h-5" /> <br />
              <span className="text-lg leading-tight">Grid View</span>
            </CardContent>
          </Card>
        </Link>

        {/* Admin-only menu items */}
        {isAdmin && (
          <>
            <Link href="/admin/tasks/create">
              <Card className="w-full h-24 shadow-sm rounded-none bg-transparent border-2 border-[#FFD700]">
                <CardContent className="flex h-full items-center justify-center gap-2 text-white p-2">
                  <Plus className="w-5 h-5" /> <br />
                  <span className="text-lg leading-tight">Create Task</span>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/tasks">
              <Card className="w-full h-24 shadow-sm rounded-none bg-transparent border-2 border-[#FFD700]">
                <CardContent className="flex h-full items-center justify-center gap-2 text-white p-2">
                  <Settings className="w-5 h-5" /> <br />
                  <span className="text-lg leading-tight">Manage Tasks</span>
                </CardContent>
              </Card>
            </Link>
          </>
        )}
      </div>

      {/* Bottom buttons */}
      <div className="mt-4 flex flex-col gap-3">
        <QRScanButton />

        {/* Grid layout for leaderboard, profile, and admin users */}
        <div
          className={`grid gap-3 ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}
        >
          <Link href="/leaderboard">
            <Button className="h-14 w-full text-lg rounded-none bg-[#9FFF82] text-black hover:bg-[#9FFF82] cursor-pointer flex items-center justify-center gap-2">
              <ArrowUpRight className="w-5 h-5" />
              <span>Leaderboard</span>
            </Button>
          </Link>

          <Link href="/profile">
            <Button className="h-14 w-full text-lg rounded-none bg-[#9FFF82] text-black hover:bg-[#9FFF82] cursor-pointer flex items-center justify-center gap-2">
              <User className="w-5 h-5" />
              <span>Profile</span>
            </Button>
          </Link>

          {/* Admin Users Management - Only for admins */}
          {isAdmin && (
            <Link href="/admin/users">
              <Button className="h-14 w-full text-lg rounded-none bg-[#A5D8FF] text-black hover:bg-[#A5D8FF] cursor-pointer flex items-center justify-center gap-2">
                <Settings className="w-5 h-5" />
                <span>User Management</span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
