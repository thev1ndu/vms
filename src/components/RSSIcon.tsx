'use client';
import { useRouter } from 'next/navigation';
import { Rss } from 'lucide-react';

export default function RSSIcon() {
  const router = useRouter();

  const handleClick = () => {
    router.push('/me?tab=accepted');
  };

  return (
    <button
      onClick={handleClick}
      className="fixed top-4 left-4 z-50 p-2 bg-transparent text-black rounded-none hover:bg-transparent text-white transition-colors cursor-pointer"
      aria-label="Go to accepted tasks"
    >
      <Rss className="w-6 h-6" />
    </button>
  );
}
