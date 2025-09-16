# Chat Migration from MongoDB to PostgreSQL

This document describes the migration of chat functionality from MongoDB to PostgreSQL.

## Overview

The chat system has been migrated from MongoDB to PostgreSQL to improve performance and consistency with the rest of the application. The migration includes:

- **Conversations**: Chat rooms and conversation metadata
- **Messages**: Individual chat messages with attachments and read status
- **Real-time features**: SSE streaming and WebSocket broadcasting remain unchanged

## Database Schema

### Conversations Table

```sql
CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  kind VARCHAR(10) NOT NULL CHECK (kind IN ('dm', 'group', 'task')),
  title VARCHAR(255),
  task_id VARCHAR(255),
  participants TEXT[],
  created_by VARCHAR(255) NOT NULL,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Messages Table

```sql
CREATE TABLE messages (
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
);
```

## Files Changed

### New Files

- `src/lib/postgres.ts` - PostgreSQL connection and table initialization
- `src/models/PostgresModels.ts` - PostgreSQL models for conversations and messages
- `scripts/init-postgres.js` - Database initialization script
- `scripts/test-postgres.js` - Migration testing script

### Modified Files

- `src/lib/chat.ts` - Updated to use PostgreSQL models
- `src/app/api/chat/global/messages/route.ts` - Updated to use PostgreSQL
- `src/app/api/admin/users/delete/route.ts` - Updated to use PostgreSQL for chat cleanup
- `env.example` - Added POSTGRES_URL environment variable

## Setup Instructions

1. **Install PostgreSQL driver**:

   ```bash
   npm install pg @types/pg
   ```

2. **Set environment variable**:
   Add to your `.env` file:

   ```
   POSTGRES_URL=postgresql://neondb_owner:npg_BZNhYVos6H9b@ep-bold-mountain-a1qfrumi-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   ```

3. **Initialize database tables**:

   ```bash
   npm run init-postgres
   ```

4. **Test the migration**:
   ```bash
   npm run test-postgres
   ```

## API Compatibility

The API endpoints remain unchanged, ensuring backward compatibility:

- `GET /api/chat/global/messages` - Fetch messages
- `POST /api/chat/global/messages` - Send messages
- `GET /api/chat/global/stream` - SSE streaming
- `GET /api/chat/mentions` - User mentions

## Data Migration

If you have existing MongoDB chat data, you'll need to create a migration script to transfer the data. The MongoDB models (`Message.ts` and `Conversation.ts`) are still available for reference during the migration process.

## Performance Improvements

- **Indexes**: Optimized indexes for common queries
- **Foreign Keys**: Proper referential integrity
- **JSONB**: Efficient storage for attachments
- **Array Operations**: Native PostgreSQL array support for participants and read_by fields

## Monitoring

The migration includes proper error handling and logging. Check the console for PostgreSQL connection status and any errors during operation.
