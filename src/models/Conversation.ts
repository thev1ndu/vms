import { Schema, model, models } from 'mongoose';
import { dbConnect } from '@/lib/db';

export type ConversationKind = 'dm' | 'group' | 'task';

export interface IConversation {
  kind: ConversationKind;
  title?: string;
  taskId?: string; // for kind === "task"
  participants: string[]; // authUserId[]
  createdBy: string; // authUserId
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    kind: {
      type: String,
      enum: ['dm', 'group', 'task'],
      required: true,
      index: true,
    },
    title: { type: String, trim: true },
    taskId: { type: String, index: true },
    participants: [{ type: String, index: true }],
    createdBy: { type: String, required: true, index: true },
    lastMessageAt: { type: Date, index: true },
  },
  { timestamps: true, versionKey: false }
);

ConversationSchema.index({ kind: 1, taskId: 1 });
ConversationSchema.index({ participants: 1 });

export default (await dbConnect(), models.Conversation) ||
  model<IConversation>('Conversation', ConversationSchema);
