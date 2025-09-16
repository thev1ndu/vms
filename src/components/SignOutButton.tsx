'use client';
import { signOut } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <LogOut
      onClick={handleSignOut}
      className="w-5 h-5 cursor-pointer text-white transition"
      aria-label="Sign out"
    />
  );
}