import { requireAdmin } from '@/lib/guards';
import User from '@/models/User';
import { z } from 'zod';

const CHAT_TAG_RE = /^[A-Za-z0-9][A-Za-z0-9 ._-]{1,30}[A-Za-z0-9]$/;
const Body = z.object({
  authUserId: z.string(),
  chatTag: z.string().trim().min(3).max(32).regex(CHAT_TAG_RE),
});

export async function POST(req: Request) {
  const gate = await requireAdmin(req);
  if (!gate.ok)
    return Response.json({ error: gate.error }, { status: gate.status });

  const { authUserId, chatTag } = Body.parse(await req.json());
  const chatTagTrim = chatTag.trim();
  const chatTagLower = chatTagTrim.toLowerCase();

  const U = await User;

  // Conflict check (case-insensitive)
  const conflict = await (
    await U
  )
    .findOne({
      chatTagLower,
      authUserId: { $ne: authUserId },
    })
    .lean();
  if (conflict) {
    return Response.json({ error: 'Chat tag already in use' }, { status: 409 });
  }

  // Ensure user exists & set both fields atomically
  const res = await (
    await U
  ).updateOne(
    { authUserId },
    {
      $setOnInsert: { authUserId, xp: 0, level: 1, badges: [] },
      $set: { chatTag: chatTagTrim, chatTagLower },
    },
    { upsert: true }
  );

  // A second fetch to return the final value
  type UserChatTagOnly = { chatTag?: string };
  const updated = (await (await U)
    .findOne({ authUserId }, { chatTag: 1 })
    .lean()
    .exec()) as UserChatTagOnly;

  if (!updated) {
    return Response.json(
      { error: 'User not found in app DB' },
      { status: 404 }
    );
  }

  return Response.json({ ok: true, chatTag: updated.chatTag });
}
