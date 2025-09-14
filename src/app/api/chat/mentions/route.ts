import { requireApproved } from '@/lib/guards';
import User from '@/models/User';

/**
 * GET /api/chat/mentions
 * Returns all users with chatTags for mention functionality
 */
export async function GET(req: Request) {
  const gate = await requireApproved(req);
  if (!gate.ok)
    return Response.json({ error: gate.error }, { status: gate.status });

  try {
    const users = await User.find(
      { chatTag: { $exists: true, $ne: null } },
      { authUserId: 1, chatTag: 1, volunteerId: 1, level: 1 }
    )
      .sort({ chatTag: 1 })
      .lean();

    const mentions = users.map((user: any) => ({
      authUserId: user.authUserId,
      chatTag: user.chatTag,
      volunteerId: user.volunteerId,
      level: user.level || 1,
    }));

    return Response.json({ mentions });
  } catch (error) {
    console.error('Error fetching mentions:', error);
    return Response.json(
      { error: 'Failed to fetch mentions' },
      { status: 500 }
    );
  }
}
