import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { makeQRDataURL } from '@/lib/qr';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user)
    return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const dataUrl = await makeQRDataURL({
    v: 1,
    kind: 'VOL',
    uid: session.user.id,
  });
  return Response.json({ dataUrl });
}
