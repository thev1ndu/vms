'use client';
import { useSession, signOut } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Clock, User } from 'lucide-react';

export default function PendingPage() {
  const { data: session } = useSession();

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Please sign in to access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const status = (session.user as any).status || 'pending';

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
            <Clock className="h-6 w-6 text-yellow-600" />
          </div>
          <CardTitle>Account Pending Approval</CardTitle>
          <CardDescription>
            Your account is currently under review. You'll be notified once it's
            approved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <User className="h-5 w-5 text-gray-500" />
            <div>
              <p className="font-medium">
                {session.user.name || session.user.email}
              </p>
              <p className="text-sm text-gray-500">Status: {status}</p>
            </div>
          </div>

          <div className="text-sm text-gray-600 space-y-2">
            <p>While you wait, you can:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Check your email for updates</li>
              <li>Contact support if you have questions</li>
              <li>Sign out and try again later</li>
            </ul>
          </div>

          <Button
            variant="outline"
            onClick={() => signOut()}
            className="w-full"
          >
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
