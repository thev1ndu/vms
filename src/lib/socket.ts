// Simple in-memory message broadcasting for real-time updates
type MessageListener = (message: any) => void;

const messageListeners = new Set<MessageListener>();

export function addMessageListener(listener: MessageListener) {
  messageListeners.add(listener);
  return () => messageListeners.delete(listener);
}

export function emitMessage(message: any) {
  console.log('Broadcasting message to listeners:', message);
  messageListeners.forEach((listener) => {
    try {
      listener(message);
    } catch (error) {
      console.error('Error in message listener:', error);
    }
  });
}

export function emitToRoom(room: string, event: string, data: any) {
  // For now, just emit to all listeners
  emitMessage(data);
}
