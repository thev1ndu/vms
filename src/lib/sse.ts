// Simple in-memory pub/sub for Server-Sent Events (SSE)

type Subscriber = (event: string, data: any) => void;

const subs = new Set<Subscriber>();

export function subscribe(fn: Subscriber) {
  subs.add(fn);
  return () => subs.delete(fn);
}

export function publish(event: string, data: any) {
  for (const fn of subs) {
    try {
      fn(event, data);
    } catch {}
  }
}

export function sseEncode(event: string, data: any) {
  return `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;
}
