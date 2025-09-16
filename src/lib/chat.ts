import { ConversationModel } from '@/models/PostgresModels';

/** Find-or-create the single global conversation and return its id */
export async function getGlobalConversationId(createdBy: string) {
  // We'll key by a special title (stable & unique enough for one-room chat)
  const title = 'Global Chat';
  let conv = await ConversationModel.findOne({ kind: 'group', title });
  if (conv) return conv.id;

  const created = await ConversationModel.create({
    kind: 'group',
    title,
    taskId: undefined,
    participants: [], // we won't maintain these for global
    createdBy, // first creator
    lastMessageAt: new Date(),
  });
  return created.id;
}
