'use client';
import { useEffect, useState } from 'react';
import { useSSE } from '@/hooks/useSSE';

export default function BadgeFixer() {
  const [hasRun, setHasRun] = useState(false);
  const [badgeEvents, setBadgeEvents] = useState<any[]>([]);

  // SSE connection for real-time badge updates
  const { close: closeSSE } = useSSE((event, data) => {
    if (event === 'badge-awarded' || event === 'badges-updated') {
      setBadgeEvents((prev) => [
        ...prev,
        { event, data, timestamp: Date.now() },
      ]);
    }
  });

  useEffect(() => {
    // Check if we've already run the badge fix
    const hasFixedBadges = localStorage.getItem('badgesFixed');

    // For debugging, let's clear the flag and force it to run
    if (hasFixedBadges) {
      localStorage.removeItem('badgesFixed');
    }

    if (hasRun) {
      return;
    }

    const fixBadges = async () => {
      try {
        const response = await fetch('/api/badges/fix-my-badges', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();

          // Mark as completed
          localStorage.setItem('badgesFixed', 'true');
          setHasRun(true);
        } else {
          // If not approved or other error, just mark as completed to avoid retries
          localStorage.setItem('badgesFixed', 'true');
          setHasRun(true);
        }
      } catch (error) {
        localStorage.setItem('badgesFixed', 'true');
        setHasRun(true);
      }
    };

    // Delay the fix slightly to avoid blocking page load
    const timeoutId = setTimeout(() => {
      fixBadges();
    }, 2000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [hasRun]);

  // Cleanup SSE connection on unmount
  useEffect(() => {
    return () => {
      closeSSE();
    };
  }, [closeSSE]);

  // Return null to not render anything visible
  return null;
}
