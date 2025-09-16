import { z } from 'zod';
import { requireApproved } from '@/lib/guards';
import { getGlobalConversationId } from '@/lib/chat';
import { MessageModel } from '@/models/PostgresModels';
import User from '@/models/User';
import { ConversationModel } from '@/models/PostgresModels';
import { publish } from '@/lib/sse';
import { emitMessage } from '@/lib/socket';

/**
 * GET /api/chat/global/messages?limit=50&before=ISO
 * - returns newest->older (server), we reverse to ascending for UI
 */
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
  const before = url.searchParams.get('before');

  const convId = await getGlobalConversationId(authUserId);

  const filter: any = { conversationId: convId };
  if (before) filter.createdAt = new Date(before);

  const docs = await MessageModel.find(filter, {
    sort: { createdAt: -1 },
    limit: limit,
  });

  // Get current sender info for all messages
  const senderIds = [...new Set(docs.map((m) => m.senderAuthUserId))];
  const senderInfo = await User.find(
    { authUserId: { $in: senderIds } },
    { authUserId: 1, level: 1, displayName: 1, volunteerId: 1 }
  ).lean();

  const infoMap = new Map<string, { level: number; displayName: string }>(
    senderInfo.map((u: any) => [
      u.authUserId,
      {
        level: u.level || 1,
        displayName: u.displayName || u.volunteerId || 'Volunteer',
      },
    ])
  );

  return Response.json({
    messages: docs.reverse().map((m) => {
      const currentInfo = infoMap.get(m.senderAuthUserId);
      const level = currentInfo?.level || 1;
      const displayName = currentInfo?.displayName || 'Volunteer';
      return {
        _id: String(m.id),
        conversationId: String(m.conversationId),
        senderAuthUserId: m.senderAuthUserId,
        senderVolunteerId: m.senderVolunteerId,
        senderDisplay: displayName,
        senderLevel: level,
        body: m.body,
        attachments: m.attachments || [],
        createdAt: m.createdAt,
      };
    }),
  });
}

const Body = z.object({
  body: z.string().min(1).max(4000),
  attachments: z
    .array(
      z.object({
        url: z.string().url(),
        name: z.string().optional(),
        mime: z.string().optional(),
      })
    )
    .optional(),
});

/**
 * POST /api/chat/global/messages
 * Realtime broadcast via SSE after persist.
 */
export async function POST(req: Request) {
  const gate = await requireApproved(req);
  if (!gate.ok)
    return Response.json({ error: gate.error }, { status: gate.status });

  const authUserId = String(gate.session!.user.id);
  const convId = await getGlobalConversationId(authUserId);

  let json: any;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: 'Bad JSON' }, { status: 400 });
  }

  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Get current sender info
  const me = (await User.findOne(
    { authUserId },
    { displayName: 1, volunteerId: 1, level: 1 }
  ).lean()) as {
    displayName?: string;
    volunteerId?: string;
    level?: number;
  } | null;
  const senderDisplay = me?.displayName || me?.volunteerId || 'Volunteer';
  const senderVolunteerId = me?.volunteerId || '#?????';
  const senderLevel = me?.level || 1;

  const msg = await MessageModel.create({
    conversationId: convId,
    senderAuthUserId: authUserId,
    senderVolunteerId,
    senderDisplay,
    body: parsed.data.body,
    attachments: parsed.data.attachments || [],
    readBy: [authUserId],
  });

  await ConversationModel.updateOne(
    { id: convId },
    { lastMessageAt: new Date() }
  );

  const payload = {
    _id: String(msg.id),
    conversationId: String(convId),
    senderAuthUserId: authUserId,
    senderVolunteerId,
    senderDisplay,
    senderLevel,
    body: msg.body,
    attachments: msg.attachments || [],
    createdAt: msg.createdAt,
  };

  // 🔊 broadcast to all SSE subscribers
  publish('message', payload);

  // 🔊 broadcast to all message listeners
  emitMessage(payload);

  return Response.json({ ok: true, message: payload });
}
