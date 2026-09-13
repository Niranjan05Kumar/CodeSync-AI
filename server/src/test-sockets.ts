import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import http from 'http';
import { io as ClientSocket, Socket } from 'socket.io-client';
import { app } from './app';
import { initSocketServer } from './sockets/socketServer';
import { generateTokens } from './utils/jwt';
import { query, checkDatabaseHealth, closePool } from './db/pool';

const TEST_PORT = 5099;

async function runSocketTests() {
  console.log('\n======================================================');
  console.log('   CodeSync AI - Phase 5 Real-Time Socket E2E Test    ');
  console.log('======================================================\n');

  const health = await checkDatabaseHealth();
  if (!health.ok) {
    console.error('❌ Database not reachable:', health.error);
    process.exit(1);
  }

  // 1. Start test HTTP & Socket.IO server
  const httpServer = http.createServer(app);
  initSocketServer(httpServer);

  await new Promise<void>((resolve) => {
    httpServer.listen(TEST_PORT, () => {
      console.log(`✅ Test server running on port ${TEST_PORT}`);
      resolve();
    });
  });

  // 2. Create or verify test project in DB
  const testUserId = '00000000-0000-0000-0000-000000000001';
  const testProjectId = '00000000-0000-0000-0000-000000000002';

  await query(
    `INSERT INTO users (id, email, username, password_hash)
     VALUES ($1, 'socket_owner@example.com', 'socket_owner', 'hashed')
     ON CONFLICT (id) DO NOTHING`,
    [testUserId]
  );

  await query(
    `INSERT INTO projects (id, name, owner_id, is_public)
     VALUES ($1, 'Socket Collab Test', $2, true)
     ON CONFLICT (id) DO NOTHING`,
    [testProjectId, testUserId]
  );

  // Generate tokens for Alice and Bob
  const aliceToken = generateTokens({
    id: '11111111-1111-1111-1111-111111111111',
    email: 'alice@example.com',
    username: 'AliceDev'
  }).accessToken;

  const bobToken = generateTokens({
    id: '22222222-2222-2222-2222-222222222222',
    email: 'bob@example.com',
    username: 'BobEngineer'
  }).accessToken;

  // Insert users for foreign key integrity in chat_messages table
  await query(
    `INSERT INTO users (id, email, username, password_hash)
     VALUES 
       ('11111111-1111-1111-1111-111111111111', 'alice@example.com', 'AliceDev', 'hashed'),
       ('22222222-2222-2222-2222-222222222222', 'bob@example.com', 'BobEngineer', 'hashed')
     ON CONFLICT (id) DO NOTHING`
  );

  console.log('✅ Generated JWT tokens for AliceDev and BobEngineer');

  // 3. Connect Alice
  const clientAlice: Socket = ClientSocket(`http://localhost:${TEST_PORT}`, {
    auth: { token: `Bearer ${aliceToken}` },
    transports: ['websocket']
  });

  // 4. Connect Bob
  const clientBob: Socket = ClientSocket(`http://localhost:${TEST_PORT}`, {
    auth: { token: `Bearer ${bobToken}` },
    transports: ['websocket']
  });

  await Promise.all([
    new Promise<void>((resolve) => clientAlice.on('connect', resolve)),
    new Promise<void>((resolve) => clientBob.on('connect', resolve))
  ]);

  console.log('✅ Alice and Bob successfully authenticated via JWT handshake');

  // Test 1: Alice joins room
  const aliceJoined = await new Promise<any>((resolve) => {
    clientAlice.emit('room:join', { projectId: testProjectId });
    clientAlice.on('room:joined', resolve);
  });
  console.log(`✅ Alice received room:joined (assigned color: ${aliceJoined.assignedColor})`);

  // Test 2: Bob joins room -> Alice receives room:user_joined
  const userJoinedPromise = new Promise<any>((resolve) => {
    clientAlice.on('room:user_joined', resolve);
  });

  clientBob.emit('room:join', { projectId: testProjectId });
  const bobJoinedEvent = await userJoinedPromise;
  console.log(`✅ Alice received peer presence for Bob (${bobJoinedEvent.user.username})`);

  // Test 3: Delta Broadcast (Alice types -> Bob receives delta, Alice does NOT)
  let aliceEchoed = false;
  clientAlice.on('editor:change', () => {
    aliceEchoed = true;
  });

  const deltaReceivedPromise = new Promise<any>((resolve) => {
    clientBob.on('editor:change', resolve);
  });

  const sampleDelta = [
    {
      range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
      rangeOffset: 0,
      rangeLength: 0,
      text: 'import numpy as np\n'
    }
  ];

  clientAlice.emit('editor:change', {
    projectId: testProjectId,
    fileId: 'file-xyz',
    changes: sampleDelta,
    version: 2
  });

  const receivedDelta = await deltaReceivedPromise;
  console.log(`✅ Bob received Monaco delta: "${receivedDelta.changes[0].text.trim()}" from ${receivedDelta.senderId}`);

  await new Promise((r) => setTimeout(r, 200));
  if (aliceEchoed) {
    throw new Error('❌ Echo loop detected: Alice received her own delta change back!');
  }
  console.log('✅ Zero echo-loop confirmed: Alice did NOT receive her own changes back');

  // Test 4: Cursor movement synchronization
  const cursorReceivedPromise = new Promise<any>((resolve) => {
    clientBob.on('cursor:update', resolve);
  });

  clientAlice.emit('cursor:move', {
    projectId: testProjectId,
    fileId: 'file-xyz',
    position: { lineNumber: 14, column: 8 }
  });

  const receivedCursor = await cursorReceivedPromise;
  console.log(`✅ Bob received Alice's cursor at Ln ${receivedCursor.position.lineNumber}, Col ${receivedCursor.position.column}`);

  // Test 5: In-Room Chat Synchronization and PostgreSQL Persistence
  const chatAlicePromise = new Promise<any>((resolve) => {
    clientAlice.on('chat:message', resolve);
  });
  const chatBobPromise = new Promise<any>((resolve) => {
    clientBob.on('chat:message', resolve);
  });

  clientBob.emit('chat:send', {
    projectId: testProjectId,
    message: 'Hey Alice! Real-time Socket.IO collaboration is active.'
  });

  const [chatForAlice, chatForBob] = await Promise.all([chatAlicePromise, chatBobPromise]);
  console.log(`✅ Both Alice and Bob received chat message: "${chatForAlice.message}"`);

  // Verify chat message persisted in PostgreSQL database
  const dbCheck = await query(
    `SELECT * FROM chat_messages WHERE id = $1`,
    [chatForAlice.id]
  );
  if (dbCheck.rows.length === 0) {
    throw new Error('❌ Chat message was not persisted to PostgreSQL database');
  }
  console.log('✅ Chat message verified in PostgreSQL chat_messages table');

  // Cleanup
  clientAlice.disconnect();
  clientBob.disconnect();

  await new Promise<void>((resolve) => {
    httpServer.close(() => resolve());
  });

  // Cleanup test database entries
  await query(`DELETE FROM projects WHERE id = $1`, [testProjectId]);
  await query(`DELETE FROM users WHERE id IN ($1, '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')`, [testUserId]);
  await closePool();

  console.log('\n======================================================');
  console.log('   🎉 ALL REAL-TIME SOCKET.IO TESTS PASSED 100%!      ');
  console.log('======================================================\n');
}

runSocketTests().catch((err) => {
  console.error('❌ Real-time socket test failed:', err);
  process.exit(1);
});
