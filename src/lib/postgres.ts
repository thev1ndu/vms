import { Pool } from 'pg';

const connectionString = process.env.POSTGRES_URL;
let cached = (global as any)._postgres as {
  conn: Pool | null;
  promise: Promise<Pool> | null;
};

if (!cached) cached = (global as any)._postgres = { conn: null, promise: null };

export async function getPostgresPool() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = new Promise(async (resolve, reject) => {
      try {
        const pool = new Pool({
          connectionString,
          ssl: {
            rejectUnauthorized: false,
          },
        });

        // Test the connection immediately
        const client = await pool.connect();
        console.log('Connected to PostgreSQL');
        client.release();

        cached.conn = pool;
        resolve(pool);
      } catch (err) {
        console.error('PostgreSQL connection error:', err);
        reject(err);
      }
    });
  }
  return await cached.promise;
}

export async function initPostgresTables() {
  const pool = await getPostgresPool();

  // Create conversations table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id SERIAL PRIMARY KEY,
      kind VARCHAR(10) NOT NULL CHECK (kind IN ('dm', 'group', 'task')),
      title VARCHAR(255),
      task_id VARCHAR(255),
      participants TEXT[],
      created_by VARCHAR(255) NOT NULL,
      last_message_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // Create indexes for conversations
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_conversations_kind ON conversations(kind);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_conversations_task_id ON conversations(task_id);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations USING GIN(participants);
  `);

  // Create messages table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_auth_user_id VARCHAR(255) NOT NULL,
      sender_volunteer_id VARCHAR(255) NOT NULL,
      sender_display VARCHAR(255) NOT NULL,
      body TEXT NOT NULL CHECK (length(body) <= 4000),
      attachments JSONB DEFAULT '[]'::jsonb,
      read_by TEXT[] DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // Create indexes for messages
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_messages_sender_auth_user_id ON messages(sender_auth_user_id);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_messages_sender_volunteer_id ON messages(sender_volunteer_id);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_messages_read_by ON messages USING GIN(read_by);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at ON messages(conversation_id, created_at DESC);
  `);

  // Create function to update updated_at timestamp
  await pool.query(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  // Create triggers for updated_at
  await pool.query(`
    DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
    CREATE TRIGGER update_conversations_updated_at
        BEFORE UPDATE ON conversations
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  `);

  await pool.query(`
    DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
    CREATE TRIGGER update_messages_updated_at
        BEFORE UPDATE ON messages
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
  `);

  console.log('PostgreSQL tables initialized successfully');
}
