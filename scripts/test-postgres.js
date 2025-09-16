#!/usr/bin/env tsx

import { initPostgresTables, getPostgresPool } from '../src/lib/postgres';
import { ConversationModel, MessageModel } from '../src/models/PostgresModels';

async function testPostgresConnection() {
  try {
    console.log('🔄 Testing PostgreSQL connection...');

    // Initialize tables
    await initPostgresTables();
    console.log('✅ Tables initialized successfully');

    // Test connection
    const pool = await getPostgresPool();
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Connection successful:', result.rows[0].current_time);

    // Test creating a conversation
    console.log('🔄 Testing conversation creation...');
    const conversation = await ConversationModel.create({
      kind: 'group',
      title: 'Test Chat',
      participants: ['test-user-1', 'test-user-2'],
      createdBy: 'test-user-1',
      lastMessageAt: new Date(),
    });
    console.log('✅ Conversation created:', conversation.id);

    // Test creating a message
    console.log('🔄 Testing message creation...');
    const message = await MessageModel.create({
      conversationId: conversation.id,
      senderAuthUserId: 'test-user-1',
      senderVolunteerId: '#00001',
      senderDisplay: 'Test User',
      body: 'Hello from PostgreSQL!',
      attachments: [],
      readBy: ['test-user-1'],
    });
    console.log('✅ Message created:', message.id);

    // Test fetching messages
    console.log('🔄 Testing message retrieval...');
    const messages = await MessageModel.find({
      conversationId: conversation.id,
    });
    console.log('✅ Messages retrieved:', messages.length);

    // Clean up test data
    console.log('🔄 Cleaning up test data...');
    await pool.query('DELETE FROM messages WHERE id = $1', [message.id]);
    await pool.query('DELETE FROM conversations WHERE id = $1', [
      conversation.id,
    ]);
    console.log('✅ Test data cleaned up');

    console.log(
      '🎉 All tests passed! PostgreSQL migration is working correctly.'
    );
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

testPostgresConnection();
