'use client';

import Image from 'next/image';
import { useSession, signIn } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Redirect logic after sign-in
  useEffect(() => {
    if (session?.user) {
      const status = (session.user as any).status || 'pending';
      if (status === 'approved') router.push('/dashboard');
      else if (status === 'suspended') router.push('/suspended');
      else router.push('/pending');
    }
  }, [session, router]);

  return (
    <main className="min-h-screen w-full bg-background">
      {/* Subtle grid / glow */}
      <div className="pointer-events-none absolute inset-0" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center p-6">
        {/* Card */}
        <div className="w-full max-w-md border border-[#FFFFFF] bg-background p-8 backdrop-blur-xl shadow-2xl">
          {/* Brand */}
          <div className="mb-6 flex flex-col items-center text-center">
            <Image
              src="/yogeshwari.png"
              alt="Yogeshwari"
              width={112}
              height={112}
              priority
              className="h-28 w-28 object-contain"
            />
            <h1 className="text-2xl font-semibold tracking-tight text-[#A5D8FF] whitespace-nowrap">
              Patrons at Yogeshwari
            </h1>
            <div className="relative mt-4 w-full">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/30"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-background px-4 text-white/60">
                  Sign in
                </span>
              </div>
            </div>
          </div>

          {/* Auth Area */}
          {!session?.user ? (
            <div className="grid gap-4">
              <Button
                onClick={async () => {
                  try {
                    setIsSigningIn(true);
                    await signIn.social({ provider: 'google' });
                  } finally {
                    setIsSigningIn(false);
                  }
                }}
                className="flex h-11 items-center justify-center gap-2 rounded-none bg-gray-500 text-white"
                aria-label="Continue with Google"
                disabled={isSigningIn}
              >
                {/* Google icon */}
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {isSigningIn ? 'Signing in…' : 'Continue with Google'}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 text-foreground">
              <span className="text-sm opacity-80 text-white">
                Redirecting…
              </span>
            </div>
          )}
        </div>

        {/* Footer / Hint */}
        <p className="mt-6 text-center text-xs text-foreground/50 text-white">
          © {new Date().getFullYear()} Yogeshwari. All rights reserved.
        </p>
      </div>
    </main>
  );
}
