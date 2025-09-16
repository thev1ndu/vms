'use client';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Clock, User } from 'lucide-react';
import Image from 'next/image';

export default function SuspendedPage() {
  const router = useRouter();
  const { data: session } = useSession();

  if (!session?.user) {
    router.push('/');
    return null;
  }

  const status = (session.user as any).status || 'suspended';

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black overflow-hidden">
      <div className="w-full max-w-sm space-y-6 text-center p-6">
        <div className="space-y-4">
          <div className="flex justify-center mb-4">
            <Image
              src="/yogeshwari.png"
              alt="Yogeshwari"
              width={200}
              height={200}
              className="rounded-none"
            />
          </div>
          <h1 className="text-4xl j font-bold text-red-500">
            ACCOUNT SUSPENDED
          </h1>
          <p className="text-white text-lg">
            {session.user.name}, <br />
            your account has been suspended.
          </p>
          <div className="bg-gray-50 p-1 rounded-none border-2">
            <p className="font-medium text-gray-800">{session.user.email}</p>
          </div>
          <p className="text-white text-lg">Sign out and contact support.</p>
        </div>

        <Button
          variant="secondary"
          onClick={() => signOut()}
          className="rounded-none text-base font-bold w-20 bg-red-500 hover:bg-red-500/95 self-center"
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
}
