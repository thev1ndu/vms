import { requireApproved } from '@/lib/guards';

export async function GET(req: Request) {
  const gate = await requireApproved(req);
  if (!gate.ok)
    return Response.json({ error: gate.error }, { status: gate.status });
  return Response.json({ id: String(gate.session!.user.id) });
}
