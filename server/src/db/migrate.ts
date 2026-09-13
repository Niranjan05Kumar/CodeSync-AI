import fs from 'fs';
import path from 'path';
import { pool, checkDatabaseHealth } from './pool';

async function runMigration() {
  console.log('\n======================================================');
  console.log('   CodeSync AI - Database Schema Migration Runner     ');
  console.log('======================================================\n');

  // 1. Initial Health Check
  console.log('[1/4] Checking database connection...');
  const health = await checkDatabaseHealth();
  
  if (!health.ok) {
    console.error('\n❌ Failed to connect to PostgreSQL database:');
    console.error(`   ${health.error}`);
    console.error('\n👉 Please verify that your DATABASE_URL in server/.env has the correct password.');
    process.exit(1);
  }

  console.log(`✅ Connected successfully in ${health.latencyMs}ms`);
  console.log(`   Server: ${health.version?.split('on')[0]?.trim() || 'PostgreSQL'}`);

  // 2. Read schema.sql
  console.log('\n[2/4] Reading schema.sql...');
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error(`❌ schema.sql file not found at ${schemaPath}`);
    process.exit(1);
  }
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

  // 3. Execute Migration Script
  console.log('[3/4] Executing DDL migrations & creating vector indexes...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN;');
    await client.query(schemaSql);
    await client.query('COMMIT;');
    console.log('✅ Schema migration executed successfully.');
  } catch (err: any) {
    await client.query('ROLLBACK;');
    console.error('\n❌ Migration failed. Transaction rolled back:');
    console.error(`   ${err.message}`);
    process.exit(1);
  } finally {
    client.release();
  }

  // 4. Verify Installed Tables, Vector Extension & HNSW Index
  console.log('\n[4/4] Verifying database objects...');
  const tablesRes = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name ASC;
  `);
  
  const extRes = await pool.query(`
    SELECT extname, extversion FROM pg_extension WHERE extname IN ('vector', 'uuid-ossp');
  `);

  const indexRes = await pool.query(`
    SELECT indexname, indexdef FROM pg_indexes 
    WHERE tablename = 'code_embeddings' AND indexname = 'idx_code_embeddings_hnsw';
  `);

  console.log('\n📦 Active Database Tables:');
  tablesRes.rows.forEach((row: any) => {
    console.log(`   • ${row.table_name}`);
  });

  console.log('\n🧩 Installed PostgreSQL Extensions:');
  extRes.rows.forEach((row: any) => {
    console.log(`   • ${row.extname} (v${row.extversion})`);
  });

  console.log('\n⚡ HNSW Vector Index:');
  if (indexRes.rows.length > 0) {
    console.log(`   • idx_code_embeddings_hnsw (Active on code_embeddings.embedding)`);
  } else {
    console.log(`   ⚠️ idx_code_embeddings_hnsw not found`);
  }

  console.log('\n======================================================');
  console.log('🎉 Phase 1 Database Migration Completed Successfully!');
  console.log('======================================================\n');
  
  await pool.end();
}

runMigration().catch((err) => {
  console.error('Fatal error during migration:', err);
  process.exit(1);
});
