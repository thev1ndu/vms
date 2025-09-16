import { useEffect, useRef } from 'react';
import { addMessageListener } from '@/lib/socket';

export function useRealtimeMessages(onNewMessage: (message: any) => void) {
  const onNewMessageRef = useRef(onNewMessage);

  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);

  useEffect(() => {
    const unsubscribe = addMessageListener((message) => {
      console.log('Received real-time message:', message);
      onNewMessageRef.current(message);
    });

    return unsubscribe;
  }, []);
}
