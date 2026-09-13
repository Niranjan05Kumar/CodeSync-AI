import http from 'http';
import { app } from './app';
import { pool, checkDatabaseHealth } from './db/pool';

// Helper to make HTTP requests against local Express app
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

async function runApiTests() {
  console.log('\n======================================================');
  console.log('   CodeSync AI - Phase 2 REST API Integration Suite   ');
  console.log('======================================================\n');

  // Verify database connection first
  console.log('Checking database connection before tests...');
  const health = await checkDatabaseHealth();
  if (!health.ok) {
    console.error('❌ Database connection failed:', health.error);
    process.exit(1);
  }
  console.log('✅ Database connected.\n');

  // Start Express server on ephemeral port (0 = OS assigns free port)
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const testPort = (server.address() as any).port;
  console.log(`[Test Runner] Temporary server listening on port ${testPort}`);

  let testUserId = '';
  let accessToken = '';
  let refreshToken = '';
  let createdProjectId = '';
  let createdFileId = '';

  const testEmail = `apitest_${Date.now()}@codesync.ai`;
  const testUsername = `tester_${Date.now().toString().slice(-6)}`;
  const testPassword = 'SecurePassword123!';

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      throw new Error(`Test assertion failed: ${testName}`);
    }
  }

  try {
    // 1. Health Check
    console.log('\n--- 1. System Health ---');
    const healthRes = await makeRequest(server, 'GET', '/api/v1/health');
    assert(healthRes.status === 200, 'GET /api/v1/health returns 200');
    assert(healthRes.data.data.status === 'UP', 'Health status is UP');
    assert(healthRes.data.data.database.ok === true, 'Database reports ok: true');

    // 2. Authentication: Register
    console.log('\n--- 2. Auth: Registration ---');
    const registerRes = await makeRequest(server, 'POST', '/api/v1/auth/register', {
      email: testEmail,
      username: testUsername,
      password: testPassword
    });
    assert(registerRes.status === 201, 'POST /api/v1/auth/register returns 201 Created');
    assert(registerRes.data.success === true, 'Registration success is true');
    assert(!!registerRes.data.data.tokens.accessToken, 'Access token is issued');
    assert(!!registerRes.data.data.tokens.refreshToken, 'Refresh token is issued');
    testUserId = registerRes.data.data.user.id;
    accessToken = registerRes.data.data.tokens.accessToken;
    refreshToken = registerRes.data.data.tokens.refreshToken;

    // Duplicate Registration Rejection
    const dupRes = await makeRequest(server, 'POST', '/api/v1/auth/register', {
      email: testEmail,
      username: testUsername,
      password: testPassword
    });
    assert(dupRes.status === 409, 'Duplicate registration returns 409 Conflict');
    assert(dupRes.data.error.code === 'EMAIL_TAKEN', 'Error code is EMAIL_TAKEN');

    // 3. Authentication: Login
    console.log('\n--- 3. Auth: Login & Refresh ---');
    const loginRes = await makeRequest(server, 'POST', '/api/v1/auth/login', {
      email: testEmail,
      password: testPassword
    });
    assert(loginRes.status === 200, 'POST /api/v1/auth/login returns 200 OK');
    assert(loginRes.data.data.user.email === testEmail.toLowerCase(), 'Login returns matching user');

    // Refresh Token
    const refreshRes = await makeRequest(server, 'POST', '/api/v1/auth/refresh', {
      refreshToken
    });
    assert(refreshRes.status === 200, 'POST /api/v1/auth/refresh returns 200 OK');
    assert(!!refreshRes.data.data.tokens.accessToken, 'Fresh access token returned');

    // 4. Protected Route: Get Me
    console.log('\n--- 4. Auth: Protected /me Endpoint ---');
    const meRes = await makeRequest(server, 'GET', '/api/v1/auth/me', undefined, accessToken);
    assert(meRes.status === 200, 'GET /api/v1/auth/me with Bearer token returns 200 OK');
    assert(meRes.data.data.user.id === testUserId, 'Profile matches test user ID');

    // Unauthorized without token
    const unauthRes = await makeRequest(server, 'GET', '/api/v1/auth/me');
    assert(unauthRes.status === 401, 'GET /api/v1/auth/me without token returns 401 Unauthorized');

    // 5. Project CRUD
    console.log('\n--- 5. Projects: Creation & Listing ---');
    const createProjRes = await makeRequest(server, 'POST', '/api/v1/projects', {
      name: 'Distributed Algo Lab',
      description: 'Automated test project for Raft consensus',
      isPublic: false,
      template: 'python'
    }, accessToken);
    assert(createProjRes.status === 201, 'POST /api/v1/projects returns 201 Created');
    assert(createProjRes.data.data.project.name === 'Distributed Algo Lab', 'Project name matches');
    assert(createProjRes.data.data.project.role === 'owner', 'Creator is designated owner');
    createdProjectId = createProjRes.data.data.project.id;

    // List Projects
    const listProjRes = await makeRequest(server, 'GET', '/api/v1/projects', undefined, accessToken);
    assert(listProjRes.status === 200, 'GET /api/v1/projects returns 200 OK');
    assert(listProjRes.data.data.projects.some((p: any) => p.id === createdProjectId), 'New project appears in user list');

    // 6. Hierarchical File Tree & Content
    console.log('\n--- 6. Files: Tree & Content Retrieval ---');
    const treeRes = await makeRequest(server, 'GET', `/api/v1/projects/${createdProjectId}/tree`, undefined, accessToken);
    assert(treeRes.status === 200, 'GET /api/v1/projects/:id/tree returns 200 OK');
    assert(treeRes.data.data.tree.length > 0, 'Starter file tree is populated');
    const readmeNode = treeRes.data.data.tree.find((n: any) => n.name === 'README.md');
    assert(!!readmeNode, 'README.md exists in root');

    // Read Starter File Content
    const fileContentRes = await makeRequest(
      server,
      'GET',
      `/api/v1/projects/${createdProjectId}/files/${readmeNode.id}`,
      undefined,
      accessToken
    );
    assert(fileContentRes.status === 200, 'GET /api/v1/projects/:id/files/:fileId returns 200 OK');
    assert(fileContentRes.data.data.file.language === 'markdown', 'Language correctly detected as markdown');

    // 7. File Creation & Update
    console.log('\n--- 7. Files: Creation & Content Versioning ---');
    const createFileRes = await makeRequest(server, 'POST', `/api/v1/projects/${createdProjectId}/files`, {
      name: 'config.py',
      isDirectory: false,
      content: 'CLUSTER_SIZE = 5\nTIMEOUT_MS = 150\n'
    }, accessToken);
    assert(createFileRes.status === 201, 'POST /api/v1/projects/:id/files returns 201 Created');
    assert(createFileRes.data.data.file.language === 'python', 'Language detected as python');
    createdFileId = createFileRes.data.data.file.id;

    // Update File Content (debounced persistence test)
    const updateRes = await makeRequest(
      server,
      'PUT',
      `/api/v1/projects/${createdProjectId}/files/${createdFileId}`,
      { content: 'CLUSTER_SIZE = 7\nTIMEOUT_MS = 200\n' },
      accessToken
    );
    assert(updateRes.status === 200, 'PUT /api/v1/projects/:id/files/:fileId returns 200 OK');
    assert(updateRes.data.data.file.version === 2, 'File version monotonically incremented to 2');

    // 8. Cascade Deletion
    console.log('\n--- 8. Cleanup & Cascade Verification ---');
    const delProjRes = await makeRequest(server, 'DELETE', `/api/v1/projects/${createdProjectId}`, undefined, accessToken);
    assert(delProjRes.status === 200, 'DELETE /api/v1/projects/:id returns 200 OK');

    // Verify files were cascaded
    const filesCheck = await pool.query('SELECT COUNT(*)::int FROM files WHERE project_id = $1;', [createdProjectId]);
    assert(filesCheck.rows[0].count === 0, 'All files cascaded on project deletion');

    // Clean up test user
    await pool.query('DELETE FROM users WHERE id = $1;', [testUserId]);
    console.log('  🧹 Cleaned up test user and associated records.');

    console.log('\n======================================================');
    console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED! PHASE 2 REST APIS ARE VERIFIED!`);
    console.log('======================================================\n');
  } catch (error: any) {
    console.error('\n❌ Test suite failure:', error.message);
    process.exitCode = 1;
  } finally {
    server.close();
    await pool.end();
  }
}

runApiTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
