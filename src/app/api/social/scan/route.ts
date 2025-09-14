import { requireApproved } from '@/lib/guards';
import User from '@/models/User';
import Connection from '@/models/Connection';
import { levelForXP } from '@/lib/level';
import { grantBadgeBySlug } from '@/lib/badges';

const CONNECT_SCAN_XP = 50;

export async function POST(req: Request) {
  const gate = await requireApproved(req);
  if (!gate.ok)
    return Response.json({ error: gate.error }, { status: gate.status });

  let payload: any;
  try {
    const body = await req.json();
    payload = body?.payload;
  } catch {
    return Response.json({ error: 'Bad JSON' }, { status: 400 });
  }
  if (!payload || payload.kind !== 'VOL' || !payload.uid) {
    return Response.json({ error: 'Invalid QR payload' }, { status: 400 });
  }

  const scanner = String(gate.session!.user.id);
  const target = String(payload.uid);
  if (scanner === target)
    return Response.json({ error: 'Cannot scan yourself' }, { status: 400 });

  type UserProfile = { xp?: number; level?: number };
  const me = ((await User.findOneAndUpdate(
    { authUserId: scanner },
    { $setOnInsert: { authUserId: scanner, xp: 0, level: 1, badges: [] } },
    { upsert: true, new: true }
  )
    .lean()
    .exec()) as UserProfile | null) || { xp: 0, level: 1 };

  const [a, b] = scanner < target ? [scanner, target] : [target, scanner];

  const upsertRes = await Connection.updateOne(
    { a, b },
    { $setOnInsert: { a, b, createdBy: scanner } },
    { upsert: true }
  );
  if (!upsertRes.upsertedId) {
    return Response.json({
      ok: true,
      message: 'Already connected. No XP awarded.',
    });
  }

  const nextXP = (me.xp ?? 0) + CONNECT_SCAN_XP;
  const prevLevel = me.level ?? 1;
  const nextLevel = levelForXP(nextXP);

  await User.updateOne(
    { authUserId: scanner },
    { $set: { xp: nextXP, level: nextLevel } }
  );

  // Grant level milestone badges if level increased
  if (nextLevel !== prevLevel) {
    if (nextLevel >= 5) await grantBadgeBySlug(scanner, 'level-5');
    if (nextLevel >= 10) await grantBadgeBySlug(scanner, 'level-10');
  }

  // Grant XP milestone badges
  if (nextXP >= 1000) await grantBadgeBySlug(scanner, 'xp-1000');
  if (nextXP >= 5000) await grantBadgeBySlug(scanner, 'xp-5000');
  if (nextXP >= 10000) await grantBadgeBySlug(scanner, 'xp-10000');

  // Grant connection badges to BOTH users
  const scannerConnections = await Connection.countDocuments({
    $or: [{ a: scanner }, { b: scanner }],
  });
  const targetConnections = await Connection.countDocuments({
    $or: [{ a: target }, { b: target }],
  });

  // Grant first connection badge if this is their first connection
  if (scannerConnections === 1)
    await grantBadgeBySlug(scanner, 'first-connection');
  if (targetConnections === 1)
    await grantBadgeBySlug(target, 'first-connection');

  // Grant milestone badges based on total connections
  if (scannerConnections >= 5) await grantBadgeBySlug(scanner, 'connections-5');
  if (scannerConnections >= 10)
    await grantBadgeBySlug(scanner, 'connections-10');
  if (targetConnections >= 5) await grantBadgeBySlug(target, 'connections-5');
  if (targetConnections >= 10) await grantBadgeBySlug(target, 'connections-10');

  return Response.json({
    ok: true,
    awarded: CONNECT_SCAN_XP,
    xp: nextXP,
    level: nextLevel,
  });
}
