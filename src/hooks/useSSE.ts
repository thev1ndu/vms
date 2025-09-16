import { useEffect, useRef } from 'react';

export function useSSE(onEvent: (event: string, data: any) => void) {
  const onEventRef = useRef(onEvent);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    // Create SSE connection
    const eventSource = new EventSource('/api/chat/global/stream');
    eventSourceRef.current = eventSource;

    // Handle different event types
    eventSource.addEventListener('ready', (event) => {
      const data = JSON.parse(event.data);
      onEventRef.current('ready', data);
    });

    eventSource.addEventListener('heartbeat', (event) => {
      const data = JSON.parse(event.data);
      onEventRef.current('heartbeat', data);
    });

    // Handle badge-related events
    eventSource.addEventListener('badge-awarded', (event) => {
      const data = JSON.parse(event.data);
      onEventRef.current('badge-awarded', data);
    });

    eventSource.addEventListener('badges-updated', (event) => {
      const data = JSON.parse(event.data);
      onEventRef.current('badges-updated', data);
    });

    // Handle generic message events
    eventSource.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      onEventRef.current('message', data);
    });

    // Handle connection errors
    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      onEventRef.current('error', { error: 'Connection failed' });
    };

    // Cleanup function
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  return {
    close: () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    },
  };
}
