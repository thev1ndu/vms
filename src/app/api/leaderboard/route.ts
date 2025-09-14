import { requireApproved } from '@/lib/guards';
import User from '@/models/User';
import Connection from '@/models/Connection';

export async function GET(req: Request) {
  const gate = await requireApproved(req);
  if (!gate.ok)
    return Response.json({ error: gate.error }, { status: gate.status });

  const authUserId = String(gate.session!.user.id);
  const url = new URL(req.url);
  const limit = Math.min(
    Math.max(Number(url.searchParams.get('limit') || 50), 1),
    200
  );

  // Top-N (sorted by level, then xp, then earliest createdAt)
  const top = await User.aggregate([
    {
      $project: {
        authUserId: 1,
        chatTag: 1,
        volunteerId: 1,
        level: { $ifNull: ['$level', 1] },
        xp: { $ifNull: ['$xp', 0] },
        badgesCount: { $size: { $ifNull: ['$badges', []] } },
        createdAt: 1,
      },
    },
    { $sort: { level: -1, xp: -1, createdAt: 1 } },
    { $limit: limit },
    // connections count for each of the top users
    {
      $lookup: {
        from: 'connections',
        let: { uid: '$authUserId' },
        pipeline: [
          {
            $match: {
              $expr: {
                $or: [{ $eq: ['$a', '$$uid'] }, { $eq: ['$b', '$$uid'] }],
              },
            },
          },
          { $count: 'c' },
        ],
        as: 'conn',
      },
    },
    { $set: { connectionsCount: { $ifNull: [{ $first: '$conn.c' }, 0] } } },
    { $unset: 'conn' },
    { $set: { name: { $ifNull: ['$chatTag', '$volunteerId'] } } },
  ]).exec();

  // Compute "me" row + rank
  const meDoc = (await User.findOne(
    { authUserId },
    {
      authUserId: 1,
      chatTag: 1,
      volunteerId: 1,
      level: 1,
      xp: 1,
      badges: 1,
      createdAt: 1,
    }
  ).lean()) as {
    authUserId: string;
    chatTag?: string;
    volunteerId?: string;
    level?: number;
    xp?: number;
    badges?: any[];
    createdAt?: Date;
  } | null;

  // Ensure a doc exists (should already, but be defensive)
  const myLevel = meDoc?.level ?? 1;
  const myXP = meDoc?.xp ?? 0;
  const myCreated = meDoc?.createdAt ?? new Date(0);

  const betterCount = await User.countDocuments({
    $or: [
      { level: { $gt: myLevel } },
      { level: myLevel, xp: { $gt: myXP } },
      { level: myLevel, xp: myXP, createdAt: { $lt: myCreated } },
    ],
  });

  const myConnections = await Connection.countDocuments({
    $or: [{ a: authUserId }, { b: authUserId }],
  });

  const me = {
    authUserId,
    name: meDoc?.chatTag ?? meDoc?.volunteerId ?? 'You',
    volunteerId: meDoc?.volunteerId ?? null,
    chatTag: meDoc?.chatTag ?? null,
    level: myLevel,
    xp: myXP,
    badgesCount: meDoc?.badges?.length ?? 0,
    connectionsCount: myConnections,
    rank: betterCount + 1,
  };

  const total = await User.countDocuments();

  // Add rank numbers to top list (1-based)
  const rows = top.map((u: any, i: number) => ({
    rank: i + 1,
    authUserId: u.authUserId,
    name: u.name || u.volunteerId || 'Volunteer',
    volunteerId: u.volunteerId ?? null,
    chatTag: u.chatTag ?? null,
    level: u.level,
    xp: u.xp,
    badgesCount: u.badgesCount ?? 0,
    connectionsCount: u.connectionsCount ?? 0,
  }));

  return Response.json({ rows, me, total });
}
