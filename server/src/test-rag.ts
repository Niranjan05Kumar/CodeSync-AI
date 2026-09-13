import http from 'http';
import { app } from './app';
import { pool, checkDatabaseHealth, query } from './db/pool';
import { chunkCode } from './utils/codeChunker';

function makeRequest(
  server: http.Server,
  method: string,
  path: string,
  body?: any,
  token?: string
): Promise<{ status: number; data: any; headers: http.IncomingHttpHeaders }> {
  const address = server.address() as any;
  const port = address.port;

  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : undefined;
    const options: http.RequestOptions = {
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    };

    const req = http.request(options, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(rawData);
          resolve({ status: res.statusCode || 500, data: parsed, headers: res.headers });
        } catch {
          resolve({ status: res.statusCode || 500, data: rawData, headers: res.headers });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runRagTests() {
  console.log('\n=============================================================');
  console.log('    CodeSync AI - Phase 8 Project-Aware RAG Pipeline Suite   ');
  console.log('=============================================================\n');

  console.log('1. Checking database & pgvector connection...');
  const health = await checkDatabaseHealth();
  if (!health.ok) {
    console.error('❌ Database connection failed:', health.error);
    process.exit(1);
  }
  console.log('✅ Database connected.\n');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}${detail ? ` - ${detail}` : ''}`);
      failed++;
    }
  }

  try {
    // 1. Test Unit: Code Chunker
    console.log('2. Test: Language-Aware Recursive Code Chunker...');
    const sampleCode = `
import os
import jwt

class AuthService:
    def __init__(self, secret_key):
        self.secret_key = secret_key

    def generate_token(self, user_id):
        payload = {"sub": user_id}
        return jwt.encode(payload, self.secret_key, algorithm="HS256")

    def verify_token(self, token):
        try:
            return jwt.decode(token, self.secret_key, algorithms=["HS256"])
        except jwt.InvalidTokenError:
            return None

def helper_logger(msg):
    print(f"[AUTH LOG]: {msg}")
    `;

    const chunks = chunkCode(sampleCode, 'src/auth.py');
    assert(chunks.length >= 1, 'Chunker generated chunks from code', `Found: ${chunks.length}`);
    const firstChunk = chunks[0];
    assert(firstChunk.startLine >= 1, 'Start line is valid 1-indexed number', String(firstChunk.startLine));
    assert(firstChunk.endLine >= firstChunk.startLine, 'End line is >= start line', `${firstChunk.startLine}-${firstChunk.endLine}`);
    assert(firstChunk.tokenCount > 0, 'Token count calculated', String(firstChunk.tokenCount));

    // 2. Authenticate test user
    console.log('\n3. Authenticating test user...');
    const uniqueId = Date.now().toString().slice(-6);
    const regRes = await makeRequest(server, 'POST', '/api/v1/auth/register', {
      username: `rag_tester_${uniqueId}`,
      email: `rag_tester_${uniqueId}@example.com`,
      password: 'Password123!',
      fullName: 'RAG Pipeline Tester'
    });

    assert(regRes.status === 201, 'Register test user for RAG testing');
    const token = regRes.data.data.tokens.accessToken;

    // 3. Create project with multiple source files
    console.log('\n4. Creating test project with multi-file codebase...');
    const projRes = await makeRequest(server, 'POST', '/api/v1/projects', {
      name: 'RAG Searchable Project',
      template: 'python'
    }, token);

    assert(projRes.status === 201, 'Create test project');
    const projectId = projRes.data.data.project.id;

    // Add auth.py file
    await makeRequest(server, 'POST', `/api/v1/projects/${projectId}/files`, {
      name: 'auth.py',
      path: 'src/auth.py',
      content: sampleCode,
      isDirectory: false
    }, token);

    // Add database.py file
    const dbCode = `
import psycopg2
from psycopg2.pool import SimpleConnectionPool

class DatabasePool:
    def __init__(self, db_url):
        self.pool = SimpleConnectionPool(minconn=1, maxconn=20, dsn=db_url)

    def get_connection(self):
        return self.pool.getconn()

    def release_connection(self, conn):
        self.pool.putconn(conn)
    `;

    await makeRequest(server, 'POST', `/api/v1/projects/${projectId}/files`, {
      name: 'database.py',
      path: 'src/database.py',
      content: dbCode,
      isDirectory: false
    }, token);

    // 4. Test: Vector Indexing Sync (POST /api/v1/rag/sync)
    console.log('\n5. Test: Project Vector Indexing (POST /api/v1/rag/sync)...');
    const syncRes = await makeRequest(server, 'POST', '/api/v1/rag/sync', {
      projectId
    }, token);

    assert(syncRes.status === 200, 'Sync project vectors returns HTTP 200', JSON.stringify(syncRes.data));
    assert(syncRes.data.data?.indexedFiles >= 2, 'Indexed multiple project files', String(syncRes.data.data?.indexedFiles));
    assert(syncRes.data.data?.totalChunks >= 2, 'Generated and stored multiple embeddings', String(syncRes.data.data?.totalChunks));

    // Verify rows stored in PostgreSQL code_embeddings with vector(1536)
    const dbEmbeddings = await query(
      `SELECT id, chunk_index, start_line, end_line, token_count, (embedding IS NOT NULL) AS has_vector 
       FROM code_embeddings WHERE project_id = $1`,
      [projectId]
    );

    assert(dbEmbeddings.rows.length >= 2, 'PostgreSQL code_embeddings rows verified in database', `Count: ${dbEmbeddings.rows.length}`);
    assert(dbEmbeddings.rows[0].has_vector === true, '1536-dimensional vector stored in pgvector column');

    // 5. Test: Project-Aware RAG Query with Citations (POST /api/v1/rag/query)
    console.log('\n6. Test: Grounded RAG Query with HNSW Search (POST /api/v1/rag/query)...');
    const queryRes = await makeRequest(server, 'POST', '/api/v1/rag/query', {
      projectId,
      query: 'How does authentication work and how are tokens verified?',
      minSimilarity: 0.50,
      limit: 3
    }, token);

    assert(queryRes.status === 200, 'RAG query returns HTTP 200', JSON.stringify(queryRes.data));
    assert(typeof queryRes.data.data?.answer === 'string' && queryRes.data.data.answer.length > 20, 'Grounded answer returned');
    assert(Array.isArray(queryRes.data.data?.citedSources), 'Cited sources array returned');

    const sources = queryRes.data.data?.citedSources || [];
    assert(sources.length > 0, 'Found matching citations via HNSW cosine search', `Citations: ${sources.length}`);

    const primaryCitation = sources[0];
    assert(typeof primaryCitation.filePath === 'string', 'Citation contains filePath', primaryCitation.filePath);
    assert(typeof primaryCitation.startLine === 'number', 'Citation contains startLine', String(primaryCitation.startLine));
    assert(typeof primaryCitation.endLine === 'number', 'Citation contains endLine', String(primaryCitation.endLine));
    assert(typeof primaryCitation.similarityScore === 'number' && primaryCitation.similarityScore > 0, 'Similarity score calculated', String(primaryCitation.similarityScore));

    console.log(`     Top match: ${primaryCitation.filePath} (Lines ${primaryCitation.startLine}-${primaryCitation.endLine}) - Similarity: ${primaryCitation.similarityScore}`);

    // Cleanup
    await query(`DELETE FROM projects WHERE id = $1`, [projectId]);
    await query(`DELETE FROM users WHERE email = $1`, [`rag_tester_${uniqueId}@example.com`]);

    console.log('\n=============================================================');
    console.log(`     RAG Pipeline Test Results: ${passed} Passed, ${failed} Failed     `);
    console.log('=============================================================\n');
  } catch (err: any) {
    console.error('Unhandled test failure:', err);
    failed++;
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await pool.end();
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runRagTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
