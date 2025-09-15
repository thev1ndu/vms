'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from '@/lib/auth-client';
import Image from 'next/image';

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();

  // Redirect after sign-in
  useEffect(() => {
    if (session?.user) {
      const status = (session.user as any).status || 'pending';
      router.push(status === 'approved' ? '/dashboard' : '/pending');
    }
  }, [session, router]);

  return (
    <main className="min-h-screen w-full bg-[#0a2314] text-white/50 grid place-items-center p-4">
      {!session?.user ? (
        <div
          className="
            w-full max-w-sm
            border border-white
            p-8
            text-center
            shadow-[0_0_0_2px_rgba(255,255,255,0.05)]
          "
        >
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Image
              src="/yogeshwari.png"
              alt="Yogeshwari"
              width={140}
              height={140}
              className="opacity-90"
              priority
            />
          </div>

          {/* Wordmark */}
          {/* <div className="tracking-[0.4em] text-xs mb-6 opacity-90">
            Y O G E S H W A R I
          </div> */}

          {/* Divider with label */}
          <div className="relative my-8">
            <div className="h-px bg-white/40" />
            <span className="absolute inset-0 -top-2 flex justify-center">
              <span className="bg-[#0a2314] px-3 text-[11px] uppercase tracking-wide text-white/80">
                Sign in With
              </span>
            </span>
          </div>

          {/* Provider buttons */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => signIn.social({ provider: 'google' })}
              className="inline-flex items-center justify-center gap-2 border border-white/70 bg-white px-4 py-2 text-sm font-medium text-[#0a2314] hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white focus:ring-offset-[#0a2314] transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>

            <button
              onClick={() => signIn.social({ provider: 'apple' })}
              className="inline-flex items-center justify-center gap-2 border border-white/70 bg-white px-4 py-2 text-sm font-medium text-[#0a2314] hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white focus:ring-offset-[#0a2314] transition"
            >
              {/* Apple icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.365 1.43c0 1.14-.463 2.2-1.214 2.98-.772.8-2.06 1.41-3.153 1.317-.145-1.1.423-2.262 1.175-3.03.78-.79 2.128-1.35 3.192-1.267zM21 17.09c-.586 1.31-.868 1.88-1.632 3.03-1.06 1.62-2.555 3.64-4.403 3.66-1.646.02-2.07-1.07-4.313-1.06-2.242.01-2.705 1.08-4.352 1.06-1.847-.02-3.28-1.85-4.34-3.47C.862 18.98-.5 15.31.86 12.37 1.67 10.64 3.28 9.49 5.07 9.46c1.81-.03 2.95 1.03 4.308 1.03 1.34 0 2.134-1.03 4.32-1 .71.01 2.9.29 4.28 2.18-3.77 2.09-3.17 6.72-.978 8.42z"/>
              </svg>
              Apple
            </button>
          </div>
        </div>
      ) : (
        <div className="text-white/80">Redirecting…</div>
      )}
    </main>
  );
}
