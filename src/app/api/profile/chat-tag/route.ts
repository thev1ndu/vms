import { z } from 'zod';
import { requireApproved } from '@/lib/guards';
import User from '@/models/User';

const CHAT_TAG_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{1,14}[A-Za-z0-9]$/;

const UpdateChatTagSchema = z.object({
  chatTag: z
    .string()
    .min(3, 'Chat tag must be at least 3 characters')
    .max(16, 'Chat tag must be at most 16 characters')
    .regex(
      CHAT_TAG_RE,
      'Nickname must be a single word (3-16 characters, letters, numbers, underscores, and hyphens only, no spaces)'
    )
    .transform((tag) => tag.trim().toLowerCase()),
});

/**
 * GET /api/profile/chat-tag
 * Get current user's nickname info including last update time
 */
export async function GET(req: Request) {
  const gate = await requireApproved(req);
  if (!gate.ok)
    return Response.json({ error: gate.error }, { status: gate.status });

  try {
    const authUserId = String(gate.session!.user.id);

    // Get user from app collection
    const user = await User.findOne(
      { authUserId },
      { chatTag: 1, chatTagLower: 1, updatedAt: 1 }
    ).lean();

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Check admin status from session (like other parts of the app)
    const role = (gate.session!.user as any).role || 'volunteer';
    const status = (gate.session!.user as any).status || 'pending';
    const isAdmin = role === 'admin' && status === 'approved';
    const lastUpdateTime = user.updatedAt;
    const canUpdate =
      isAdmin ||
      !lastUpdateTime ||
      Date.now() - new Date(lastUpdateTime).getTime() >= 24 * 60 * 60 * 1000;

    return Response.json({
      chatTag: user.chatTag || null,
      canUpdate,
      isAdmin,
      lastUpdateTime: lastUpdateTime || null,
      nextUpdateTime: canUpdate
        ? null
        : new Date(new Date(lastUpdateTime).getTime() + 24 * 60 * 60 * 1000),
    });
  } catch (error) {
    console.error('Error fetching chat tag info:', error);
    return Response.json(
      { error: 'Failed to fetch nickname info' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/profile/chat-tag
 * Update user's nickname (with 24h cooldown for non-admins)
 */
export async function PUT(req: Request) {
  const gate = await requireApproved(req);
  if (!gate.ok)
    return Response.json({ error: gate.error }, { status: gate.status });

  try {
    const authUserId = String(gate.session!.user.id);

    // Check admin status from session (like other parts of the app)
    const role = (gate.session!.user as any).role || 'volunteer';
    const status = (gate.session!.user as any).status || 'pending';
    const isAdmin = role === 'admin' && status === 'approved';

    // Parse request body
    const json = await req.json();
    const parsed = UpdateChatTagSchema.safeParse(json);

    if (!parsed.success) {
      return Response.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { chatTag } = parsed.data;

    // Check if user exists and can update
    const user = await User.findOne({ authUserId });
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Check cooldown for non-admins
    if (!isAdmin) {
      const lastUpdateTime = user.updatedAt;
      if (
        lastUpdateTime &&
        Date.now() - new Date(lastUpdateTime).getTime() < 24 * 60 * 60 * 1000
      ) {
        const nextUpdateTime = new Date(
          new Date(lastUpdateTime).getTime() + 24 * 60 * 60 * 1000
        );
        return Response.json(
          {
            error: 'Nickname can only be updated once per 24 hours',
            nextUpdateTime,
          },
          { status: 429 }
        );
      }
    }

    // Check if chat tag is already taken
    const existingUser = await User.findOne({
      chatTagLower: chatTag.toLowerCase(),
      authUserId: { $ne: authUserId },
    });

    if (existingUser) {
      return Response.json(
        { error: 'Nickname is already taken' },
        { status: 409 }
      );
    }

    // Update the chat tag
    await User.updateOne(
      { authUserId },
      {
        chatTag,
        chatTagLower: chatTag.toLowerCase(),
        updatedAt: new Date(),
      }
    );

    return Response.json({
      success: true,
      chatTag,
      message: 'Nickname updated successfully',
    });
  } catch (error) {
    console.error('Error updating chat tag:', error);
    return Response.json(
      { error: 'Failed to update nickname' },
      { status: 500 }
    );
  }
}
