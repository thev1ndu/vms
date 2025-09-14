'use client';

import Image from 'next/image';
import { LogOut, ArrowLeft } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { signOut } from '@/lib/auth-client';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <div className="relative flex items-center justify-center h-[20vh]">
      {/* Centered Logo */}
      <Image
        src="/yogeshwari.png"
        alt="Yogeshwari Logo"
        width={200}
        height={200}
        className="object-contain"
      />

      {/* Show back arrow only if NOT on /dashboard */}
      {pathname !== '/dashboard' && (
        <ArrowLeft
          onClick={() => router.push('/dashboard')}
          className="absolute left-4 top-4 w-5 h-5 cursor-pointer text-white transition"
          aria-label="Back to Dashboard"
        />
      )}

      {/* Always show logout on the right */}
      <LogOut
        onClick={handleSignOut}
        className="absolute right-4 top-4 w-5 h-5 cursor-pointer text-white transition"
        aria-label="Sign out"
      />
    </div>
  );
}
