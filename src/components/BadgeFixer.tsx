'use client';
import { useEffect, useState } from 'react';

export default function BadgeFixer() {
  const [hasRun, setHasRun] = useState(false);

  useEffect(() => {
    console.log('BadgeFixer: useEffect triggered');

    // Check if we've already run the badge fix
    const hasFixedBadges = localStorage.getItem('badgesFixed');
    console.log('BadgeFixer: hasFixedBadges =', hasFixedBadges);
    console.log('BadgeFixer: hasRun =', hasRun);

    // For debugging, let's clear the flag and force it to run
    if (hasFixedBadges) {
      console.log('BadgeFixer: Clearing localStorage flag for testing');
      localStorage.removeItem('badgesFixed');
    }

    if (hasRun) {
      console.log('BadgeFixer: hasRun is true, skipping');
      return;
    }

    console.log('BadgeFixer: Proceeding with badge fix...');

    const fixBadges = async () => {
      console.log('BadgeFixer: Starting badge fix...');

      try {
        const response = await fetch('/api/badges/fix-my-badges', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log('BadgeFixer: Response status =', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('BadgeFixer: Response data =', data);

          // Mark as completed
          localStorage.setItem('badgesFixed', 'true');
          setHasRun(true);

          if (data.badgesAwarded && data.badgesAwarded.length > 0) {
            console.log('BadgeFixer: Awarded badges =', data.badgesAwarded);
          } else {
            console.log('BadgeFixer: No new badges awarded');
          }
        } else {
          console.log('BadgeFixer: Response not ok, status =', response.status);
          const errorData = await response.text();
          console.log('BadgeFixer: Error response =', errorData);

          // If not approved or other error, just mark as completed to avoid retries
          localStorage.setItem('badgesFixed', 'true');
          setHasRun(true);
        }
      } catch (error) {
        console.log('BadgeFixer: Network error =', error);
        localStorage.setItem('badgesFixed', 'true');
        setHasRun(true);
      }
    };

    // Delay the fix slightly to avoid blocking page load
    console.log('BadgeFixer: Setting timeout for badge fix...');
    const timeoutId = setTimeout(() => {
      console.log('BadgeFixer: Timeout executed, calling fixBadges');
      fixBadges();
    }, 2000);

    return () => {
      console.log('BadgeFixer: Cleanup timeout');
      clearTimeout(timeoutId);
    };
  }, [hasRun]);

  // Return null to not render anything visible
  return null;
}
