'use client';
import { useEffect, useState } from 'react';

export default function DailyPing() {
  const [hasPingedToday, setHasPingedToday] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if we've already pinged today
    const lastPingDate = localStorage.getItem('lastDailyPing');
    const today = new Date().toDateString();

    if (lastPingDate === today) {
      setHasPingedToday(true);
      return;
    }

    // Only ping if user is authenticated and hasn't pinged today
    const pingDaily = async () => {
      if (isLoading || hasPingedToday) return;

      setIsLoading(true);
      try {
        const response = await fetch('/api/ping', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('lastDailyPing', today);
          setHasPingedToday(true);

          // Log streak info if available
          if (data.streak?.count > 1) {
            console.log(`Daily streak: ${data.streak.count} days!`);
          } else {
            console.log('Daily ping completed!');
          }
        } else {
          // Don't show error for auth issues, just fail silently
          console.log('Daily ping failed:', response.status);
        }
      } catch (error) {
        // Fail silently for network errors
        console.log('Daily ping error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Delay the ping slightly to avoid blocking page load
    const timeoutId = setTimeout(pingDaily, 1000);

    return () => clearTimeout(timeoutId);
  }, [isLoading, hasPingedToday]);

  // Return null to not render anything visible
  return null;
}
