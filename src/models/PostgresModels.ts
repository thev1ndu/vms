import { Pool } from 'pg';
import { getPostgresPool } from '@/lib/postgres';

export type ConversationKind = 'dm' | 'group' | 'task';

export interface Conversation {
  id: number;
  kind: ConversationKind;
  title?: string;
  taskId?: string;
  participants: string[];
  createdBy: string;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: number;
  conversationId: number;
  senderAuthUserId: string;
  senderVolunteerId: string;
  senderDisplay: string;
  body: string;
  attachments: { url: string; name?: string; mime?: string }[];
  readBy: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class ConversationModel {
  private static pool: Pool | null = null;

  private static async getPool() {
    if (!this.pool) {
      this.pool = await getPostgresPool();
    }
    return this.pool;
  }

  static async findOne(
    filter: Partial<Conversation>
  ): Promise<Conversation | null> {
    const pool = await this.getPool();
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (filter.kind) {
      conditions.push(`kind = $${paramCount++}`);
      values.push(filter.kind);
    }
    if (filter.title) {
      conditions.push(`title = $${paramCount++}`);
      values.push(filter.title);
    }
    if (filter.taskId) {
      conditions.push(`task_id = $${paramCount++}`);
      values.push(filter.taskId);
    }

    const query = `SELECT * FROM conversations WHERE ${conditions.join(
      ' AND '
    )} LIMIT 1`;
    const result = await pool.query(query, values);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      kind: row.kind,
      title: row.title,
      taskId: row.task_id,
      participants: row.participants || [],
      createdBy: row.created_by,
      lastMessageAt: row.last_message_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  static async create(
    data: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Conversation> {
    const pool = await this.getPool();
    const query = `
      INSERT INTO conversations (kind, title, task_id, participants, created_by, last_message_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [
      data.kind,
      data.title || null,
      data.taskId || null,
      data.participants || [],
      data.createdBy,
      data.lastMessageAt || null,
    ];

    const result = await pool.query(query, values);
    const row = result.rows[0];

    return {
      id: row.id,
      kind: row.kind,
      title: row.title,
      taskId: row.task_id,
      participants: row.participants || [],
      createdBy: row.created_by,
      lastMessageAt: row.last_message_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  static async updateOne(
    filter: Partial<Conversation>,
    update: Partial<Conversation>
  ): Promise<void> {
    const pool = await this.getPool();
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (filter.id) {
      conditions.push(`id = $${paramCount++}`);
      values.push(filter.id);
    }

    const updateFields: string[] = [];
    if (update.lastMessageAt !== undefined) {
      updateFields.push(`last_message_at = $${paramCount++}`);
      values.push(update.lastMessageAt);
    }

    if (updateFields.length === 0) return;

    const query = `UPDATE conversations SET ${updateFields.join(
      ', '
    )} WHERE ${conditions.join(' AND ')}`;
    await pool.query(query, values);
  }
}

export class MessageModel {
  private static pool: Pool | null = null;

  private static async getPool() {
    if (!this.pool) {
      this.pool = await getPostgresPool();
    }
    return this.pool;
  }

  static async find(
    filter: Partial<Message>,
    options: { sort?: { [key: string]: 1 | -1 }; limit?: number } = {}
  ): Promise<Message[]> {
    const pool = await this.getPool();
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (filter.conversationId) {
      conditions.push(`conversation_id = $${paramCount++}`);
      values.push(filter.conversationId);
    }
    if (filter.createdAt) {
      conditions.push(`created_at < $${paramCount++}`);
      values.push(filter.createdAt);
    }

    let query = `SELECT * FROM messages`;
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    if (options.sort) {
      const sortFields = Object.entries(options.sort).map(
        ([field, direction]) => {
          const dbField = field === 'createdAt' ? 'created_at' : field;
          return `${dbField} ${direction === 1 ? 'ASC' : 'DESC'}`;
        }
      );
      query += ` ORDER BY ${sortFields.join(', ')}`;
    }

    if (options.limit) {
      query += ` LIMIT $${paramCount++}`;
      values.push(options.limit);
    }

    const result = await pool.query(query, values);

    return result.rows.map((row) => ({
      id: row.id,
      conversationId: row.conversation_id,
      senderAuthUserId: row.sender_auth_user_id,
      senderVolunteerId: row.sender_volunteer_id,
      senderDisplay: row.sender_display,
      body: row.body,
      attachments: row.attachments || [],
      readBy: row.read_by || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  static async create(
    data: Omit<Message, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Message> {
    const pool = await this.getPool();
    const query = `
      INSERT INTO messages (conversation_id, sender_auth_user_id, sender_volunteer_id, sender_display, body, attachments, read_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      data.conversationId,
      data.senderAuthUserId,
      data.senderVolunteerId,
      data.senderDisplay,
      data.body,
      JSON.stringify(data.attachments || []),
      data.readBy || [],
    ];

    const result = await pool.query(query, values);
    const row = result.rows[0];

    return {
      id: row.id,
      conversationId: row.conversation_id,
      senderAuthUserId: row.sender_auth_user_id,
      senderVolunteerId: row.sender_volunteer_id,
      senderDisplay: row.sender_display,
      body: row.body,
      attachments: row.attachments || [],
      readBy: row.read_by || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
