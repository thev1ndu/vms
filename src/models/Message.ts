import { Schema, model, models } from 'mongoose';
import { dbConnect } from '@/lib/db';

export interface IMessage {
  conversationId: Schema.Types.ObjectId;
  senderAuthUserId: string;
  senderVolunteerId: string; // e.g., "#00023"
  senderDisplay: string; // snapshot of chatTag/volunteerId at send time
  body: string;
  attachments?: { url: string; name?: string; mime?: string }[];
  readBy: string[]; // authUserId[]
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    senderAuthUserId: { type: String, required: true, index: true },
    senderVolunteerId: { type: String, required: true, index: true },
    senderDisplay: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true, maxlength: 4000 },
    attachments: [
      {
        url: { type: String, trim: true },
        name: { type: String, trim: true },
        mime: { type: String, trim: true },
      },
    ],
    readBy: [{ type: String, index: true }],
  },
  { timestamps: true, versionKey: false }
);

MessageSchema.index({ conversationId: 1, createdAt: -1 });

export default (await dbConnect(), models.Message) ||
  model<IMessage>('Message', MessageSchema);
