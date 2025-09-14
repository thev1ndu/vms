import { requireApproved } from '@/lib/guards';
import { subscribe, sseEncode } from '@/lib/sse';

export const runtime = 'nodejs'; // ensure Node runtime for SSE
export const revalidate = 0;

export async function GET(req: Request) {
  const gate = await requireApproved(req);
  if (!gate.ok) return new Response('Unauthorized', { status: gate.status });

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: any) =>
        controller.enqueue(encoder.encode(sseEncode(event, data)));

      // initial ready ping
      send('ready', { ok: true });

      // subscribe to broker
      const unsub = subscribe(send);

      // heartbeats to keep proxies happy
      const hb = setInterval(
        () => send('heartbeat', { t: Date.now() }),
        25_000
      );

      // close handling
      const abort = (req as any).signal as AbortSignal | undefined;
      abort?.addEventListener('abort', () => {
        clearInterval(hb);
        unsub();
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
