import type { Metadata } from 'next';
import './globals.css';
import DailyPing from '@/components/DailyPing';
import BadgeFixer from '@/components/BadgeFixer';
import '@/components/components.css';

export const metadata: Metadata = {
  title: 'y0g3shwar1',
  description: 'y0g3shwar1 ag3n7 sys73m',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-background text-foreground px-[5vh]">
        <DailyPing />
        <BadgeFixer />
        <div className="max-w-6xl mx-auto p-2">{children}</div>
      </body>
    </html>
  );
}
