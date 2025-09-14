import { NextRequest } from 'next/server';
import { getSocketIO } from '@/lib/socket';

export async function GET(req: NextRequest) {
  const io = getSocketIO();

  // Handle Socket.IO connection
  if (req.headers.get('upgrade') === 'websocket') {
    // This will be handled by Socket.IO internally
    return new Response('Socket.IO connection', { status: 101 });
  }

  return new Response('Socket.IO server running', { status: 200 });
}
