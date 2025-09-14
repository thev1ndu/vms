import Conversation from '@/models/Conversation';

/** Find-or-create the single global conversation and return its _id */
export async function getGlobalConversationId(createdBy: string) {
  // We'll key by a special title (stable & unique enough for one-room chat)
  const title = 'Global Chat';
  let conv = (await Conversation.findOne({ kind: 'group', title }).lean()) as {
    _id: any;
  } | null;
  if (conv) return conv._id as any;

  const created = await Conversation.create({
    kind: 'group',
    title,
    taskId: undefined,
    participants: [], // we won't maintain these for global
    createdBy, // first creator
    lastMessageAt: new Date(),
  });
  return created._id as any;
}
