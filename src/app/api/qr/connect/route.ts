import { z } from 'zod';
import { requireApproved } from '@/lib/guards';
import Connection from '@/models/Connection';
import User from '@/models/User';
import { levelForXP } from '@/lib/level';
import { grantBadgeBySlug } from '@/lib/badges';

export const runtime = 'nodejs';

const Body = z.object({
  // Either scan payload OR pass otherAuthUserId directly
  payload: z
    .object({ v: z.number(), kind: z.literal('USER'), authUserId: z.string() })
    .optional(),
  otherAuthUserId: z.string().optional(),
});

function orderPair(x: string, y: string) {
  return x < y ? ([x, y] as const) : ([y, x] as const);
}

export async function POST(req: Request) {
  const gate = await requireApproved(req);
  if (!gate.ok)
    return Response.json({ error: gate.error }, { status: gate.status });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: 'Bad JSON' }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success)
    return Response.json({ error: 'Invalid body' }, { status: 400 });

  const meId = String(gate.session!.user.id);
  const otherId =
    parsed.data.payload?.authUserId || parsed.data.otherAuthUserId;

  if (!otherId)
    return Response.json(
      { error: 'Missing otherAuthUserId/payload' },
      { status: 400 }
    );
  if (otherId === meId)
    return Response.json(
      { error: 'Cannot connect with yourself' },
      { status: 400 }
    );

  const [a, b] = orderPair(meId, otherId);
  const C = await Connection;

  // Unique pair; only first time should award XP
  const res = await (
    await C
  ).updateOne(
    { a, b },
    { $setOnInsert: { a, b, createdBy: meId } },
    { upsert: true }
  );
  const created =
    (res as any)?.upsertedId != null || (res as any)?.upsertedCount > 0;
  if (!created) {
    return Response.json({
      ok: true,
      connected: true,
      awardedXP: 0,
      message: 'Already connected',
    });
  }

  // Ensure both users exist
  const U = await User;
  await (
    await U
  ).updateOne(
    { authUserId: meId },
    { $setOnInsert: { authUserId: meId, xp: 0, level: 1, badges: [] } },
    { upsert: true }
  );
  await (
    await U
  ).updateOne(
    { authUserId: otherId },
    { $setOnInsert: { authUserId: otherId, xp: 0, level: 1, badges: [] } },
    { upsert: true }
  );

  // Award XP to scanner only
  const xpDelta = 50;
  const meDoc = await (
    await U
  ).findOneAndUpdate(
    { authUserId: meId },
    { $inc: { xp: xpDelta } },
    { new: true, projection: { xp: 1, level: 1 } }
  );

  // Recalc level + milestone badges
  const totalXP = meDoc?.xp ?? 0;
  const prevLevel = meDoc?.level ?? 1;
  const newLevel = levelForXP(totalXP);

  // Always update the level to ensure it's correct
  await (
    await U
  ).updateOne({ authUserId: meId }, { $set: { level: newLevel } });

  // Grant level milestone badges if level increased
  if (newLevel !== prevLevel) {
    if (newLevel >= 5) await grantBadgeBySlug(meId, 'level-5');
    if (newLevel >= 10) await grantBadgeBySlug(meId, 'level-10');
  }

  // Grant XP milestone badges
  if (totalXP >= 1000) await grantBadgeBySlug(meId, 'xp-1000');
  if (totalXP >= 5000) await grantBadgeBySlug(meId, 'xp-5000');
  if (totalXP >= 10000) await grantBadgeBySlug(meId, 'xp-10000');

  // Connection badges to BOTH users (idempotent)
  // Check if this is the first connection for each user
  const myConnections = await (
    await C
  ).countDocuments({ $or: [{ a: meId }, { b: meId }] });
  const otherConnections = await (
    await C
  ).countDocuments({ $or: [{ a: otherId }, { b: otherId }] });

  // Grant first connection badge if this is their first connection
  if (myConnections === 1) await grantBadgeBySlug(meId, 'first-connection');
  if (otherConnections === 1)
    await grantBadgeBySlug(otherId, 'first-connection');

  // Grant milestone badges based on total connections
  if (myConnections >= 5) await grantBadgeBySlug(meId, 'connections-5');
  if (myConnections >= 10) await grantBadgeBySlug(meId, 'connections-10');
  if (otherConnections >= 5) await grantBadgeBySlug(otherId, 'connections-5');
  if (otherConnections >= 10) await grantBadgeBySlug(otherId, 'connections-10');

  return Response.json({
    ok: true,
    connected: true,
    awardedXP: xpDelta,
    level: newLevel,
    totalXP,
  });
}
