import { requireApproved } from '@/lib/guards';
import User from '@/models/User';
import Connection from '@/models/Connection';

type UserDoc = {
  authUserId: string;
  displayName?: string;
  volunteerId?: string;
  level?: number;
  xp?: number;
  badges?: any[];
};

export async function GET(req: Request) {
  const gate = await requireApproved(req);
  if (!gate.ok) {
    return Response.json({ error: gate.error }, { status: gate.status });
  }

  const authUserId = String(gate.session!.user.id);
  const url = new URL(req.url);
  const limit = Math.min(
    Math.max(Number(url.searchParams.get('limit') || 50), 1),
    200
  );
  const page = Math.max(Number(url.searchParams.get('page') || 1), 1);
  const skip = (page - 1) * limit;

  try {
    // Get user's connections
    const connections = await Connection.find({
      $or: [{ a: authUserId }, { b: authUserId }],
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get all connected user IDs
    const connectedUserIds = connections.map((conn) =>
      conn.a === authUserId ? conn.b : conn.a
    );

    // Get user details for connected users
    const connectedUsers = (await User.find(
      { authUserId: { $in: connectedUserIds } },
      {
        authUserId: 1,
        displayName: 1,
        volunteerId: 1,
        level: 1,
        xp: 1,
        badges: 1,
      }
    ).lean()) as UserDoc[];

    // Create a map for quick lookup
    const userMap = new Map<string, UserDoc>(
      connectedUsers.map((user: UserDoc) => [user.authUserId, user])
    );

    // Combine connection data with user details
    const connectionsWithUsers = connections.map((conn) => {
      const otherUserId = conn.a === authUserId ? conn.b : conn.a;
      const otherUser = userMap.get(otherUserId);

      return {
        connectionId: conn._id,
        otherUser: {
          authUserId: otherUserId,
          displayName: otherUser?.displayName || null,
          volunteerId: otherUser?.volunteerId || null,
          level: otherUser?.level || 1,
          xp: otherUser?.xp || 0,
          badgesCount: otherUser?.badges?.length || 0,
        },
        createdAt: conn.createdAt,
        createdBy: conn.createdBy,
        wasCreatedByMe: conn.createdBy === authUserId,
      };
    });

    // Get total count for pagination
    const totalConnections = await Connection.countDocuments({
      $or: [{ a: authUserId }, { b: authUserId }],
    });

    return Response.json({
      connections: connectionsWithUsers,
      pagination: {
        page,
        limit,
        total: totalConnections,
        totalPages: Math.ceil(totalConnections / limit),
        hasNext: page * limit < totalConnections,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching connections:', error);
    return Response.json(
      { error: 'Failed to fetch connections' },
      { status: 500 }
    );
  }
}
