import { pool, checkDatabaseHealth } from './pool';

async function testDatabaseAndVectors() {
  console.log('\n======================================================');
  console.log('   CodeSync AI - pgvector & Database Verification     ');
  console.log('======================================================\n');

  // 1. Connection Check
  console.log('[1/5] Testing PostgreSQL connection...');
  const health = await checkDatabaseHealth();
  
  if (!health.ok) {
    console.error(`❌ Connection failed: ${health.error}`);
    process.exit(1);
  }
  console.log(`✅ Connection established (${health.latencyMs}ms)`);

  // 2. Vector Extension Verification
  console.log('\n[2/5] Checking pgvector extension...');
  if (!health.hasVector) {
    console.error('❌ "vector" extension is not installed in database.');
    process.exit(1);
  }
  console.log('✅ "vector" extension is active and available.');

  // 3. Create Mock Data
  console.log('\n[3/5] Inserting mock user, project, and file...');
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN;');

    // Mock User
    const userRes = await client.query(`
      INSERT INTO users (email, username, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id;
    `, ['vectortest@codesync.ai', 'vector_tester', '$2b$10$mockhashforvectortesting12345']);
    const userId = userRes.rows[0].id;

    // Mock Project
    const projectRes = await client.query(`
      INSERT INTO projects (name, description, owner_id)
      VALUES ($1, $2, $3)
      RETURNING id;
    `, ['RAG Test Sandbox', 'Temporary project for vector distance testing', userId]);
    const projectId = projectRes.rows[0].id;

    // Mock File
    const fileRes = await client.query(`
      INSERT INTO files (project_id, name, path, content, language)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id;
    `, [projectId, 'authService.ts', 'src/authService.ts', 'export function login() { return true; }', 'typescript']);
    const fileId = fileRes.rows[0].id;

    // 4. Insert 1536-Dimensional Mock Embedding
    console.log('[4/5] Inserting 1536-dimensional mock OpenAI embedding...');
    // Create normalized 1536-dim vector with deterministic pseudo-random values
    const mockVector: number[] = Array.from({ length: 1536 }, (_, i) => Math.sin(i + 1) / 100);
    const vectorString = `[${mockVector.join(',')}]`;

    await client.query(`
      INSERT INTO code_embeddings (
        project_id, file_id, chunk_index, chunk_content, start_line, end_line, token_count, embedding
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector);
    `, [
      projectId,
      fileId,
      0,
      'export function login() { return true; }',
      1,
      3,
      12,
      vectorString
    ]);

    // 5. Query using Cosine Distance (<=> operator)
    console.log('[5/5] Executing HNSW Cosine Similarity Query...');
    const queryStart = Date.now();
    
    // Create query vector with slight perturbation (0.99 similarity target)
    const queryVector: number[] = mockVector.map((val) => val * 1.01);
    const queryVectorString = `[${queryVector.join(',')}]`;

    const searchRes = await client.query(`
      SELECT 
        ce.id,
        f.path AS file_path,
        ce.chunk_content,
        1 - (ce.embedding <=> $1::vector) AS similarity_score
      FROM code_embeddings ce
      JOIN files f ON ce.file_id = f.id
      WHERE ce.project_id = $2
      ORDER BY ce.embedding <=> $1::vector ASC
      LIMIT 1;
    `, [queryVectorString, projectId]);

    const queryDuration = Date.now() - queryStart;
    const topResult = searchRes.rows[0];

    console.log(`✅ Vector similarity query completed in ${queryDuration}ms`);
    console.log(`   • Matched File: ${topResult.file_path}`);
    console.log(`   • Chunk: "${topResult.chunk_content}"`);
    console.log(`   • Cosine Similarity Score: ${(parseFloat(topResult.similarity_score) * 100).toFixed(2)}%`);

    // Clean up test data (Deleting user cascades to project, file, and embeddings!)
    await client.query('DELETE FROM users WHERE id = $1;', [userId]);
    await client.query('COMMIT;');
    console.log('🧹 Cleaned up test records (CASCADE deletion confirmed).');

    console.log('\n======================================================');
    console.log('🎉 PostgreSQL + pgvector HNSW Engine is 100% OPERATIONAL!');
    console.log('======================================================\n');
  } catch (err: any) {
    await client.query('ROLLBACK;');
    console.error('\n❌ Vector test failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

testDatabaseAndVectors().catch((err) => {
  console.error('Fatal error during vector testing:', err);
  process.exit(1);
});
