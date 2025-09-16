#!/usr/bin/env tsx

import { initPostgresTables } from '../src/lib/postgres';

async function main() {
  try {
    console.log('Initializing PostgreSQL tables...');
    await initPostgresTables();
    console.log('✅ PostgreSQL tables initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to initialize PostgreSQL tables:', error);
    process.exit(1);
  }
}

main();
