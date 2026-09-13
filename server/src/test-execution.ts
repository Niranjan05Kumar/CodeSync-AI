import http from 'http';
import { app } from './app';
import { pool, checkDatabaseHealth, query } from './db/pool';

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

async function runExecutionTests() {
  console.log('\n=============================================================');
  console.log('   CodeSync AI - Phase 6 Sandboxed Code Execution Suite   ');
  console.log('=============================================================\n');

  console.log('1. Checking database connectivity...');
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
    // Register/login test user
    console.log('2. Authenticating test user for execution API...');
    const uniqueId = Date.now().toString().slice(-6);
    const testEmail = `sandbox_tester_${uniqueId}@example.com`;
    const testUsername = `tester_${uniqueId}`;
    const regRes = await makeRequest(server, 'POST', '/api/v1/auth/register', {
      username: testUsername,
      email: testEmail,
      password: 'Password123!',
      fullName: 'Sandbox Tester'
    });

    assert(regRes.status === 201, 'Register test user', JSON.stringify(regRes.data));
    const token = regRes.data.data.tokens.accessToken;

    // Create a test project
    console.log('\n3. Creating test project...');
    const projRes = await makeRequest(server, 'POST', '/api/v1/projects', {
      name: 'Sandbox Test Project',
      template: 'javascript'
    }, token);

    assert(projRes.status === 201, 'Create test project', JSON.stringify(projRes.data));
    const projectId = projRes.data.data.project.id;

    // Test 1: JavaScript/Node execution
    console.log('\n4. Test: Standard code execution (JavaScript/Node)...');
    const execRes1 = await makeRequest(server, 'POST', '/api/v1/execute', {
      projectId,
      language: 'javascript',
      code: 'console.log("Hello from CodeSync Sandbox!");'
    }, token);

    assert(execRes1.status === 200, 'Execute code HTTP 200', JSON.stringify(execRes1.data));
    assert(execRes1.data.data?.status === 'completed', 'Execution status is completed', execRes1.data.data?.status);
    assert(execRes1.data.data?.exitCode === 0, 'Exit code is 0', String(execRes1.data.data?.exitCode));
    assert(execRes1.data.data?.stdout.includes('Hello from CodeSync Sandbox!'), 'Stdout matches expected output', execRes1.data.data?.stdout);
    console.log(`     Execution wall-clock time: ${execRes1.data.data?.executionTimeMs}ms`);

    // Test 2: Standard input (stdin) piping
    console.log('\n5. Test: Standard input (stdin) transmission...');
    const execRes2 = await makeRequest(server, 'POST', '/api/v1/execute', {
      projectId,
      language: 'javascript',
      code: `
        process.stdin.on('data', (d) => {
          console.log('INPUT_RECEIVED:' + d.toString().trim());
        });
      `,
      stdin: 'CodeSyncSandboxTestInput'
    }, token);

    assert(execRes2.status === 200, 'Stdin execution HTTP 200', JSON.stringify(execRes2.data));
    assert(execRes2.data.data?.stdout.includes('INPUT_RECEIVED:CodeSyncSandboxTestInput'), 'Stdin processed correctly into stdout', execRes2.data.data?.stdout);

    // Test 3: Hard SIGKILL timeout limit (5000ms wall-clock ceiling)
    console.log('\n6. Test: Hard SIGKILL timeout enforcement (5000ms limit)...');
    console.log('   Running infinite loop script (while(true) {})... Waiting for SIGKILL...');
    const startTime = Date.now();
    const timeoutRes = await makeRequest(server, 'POST', '/api/v1/execute', {
      projectId,
      language: 'javascript',
      code: 'while (true) {}'
    }, token);
    const elapsed = Date.now() - startTime;

    assert(timeoutRes.status === 200, 'Timeout request HTTP 200', JSON.stringify(timeoutRes.data));
    assert(timeoutRes.data.data?.status === 'timeout', 'Status is timeout', timeoutRes.data.data?.status);
    assert(timeoutRes.data.data?.exitCode === 137, 'Exit code is 137 (SIGKILL)', String(timeoutRes.data.data?.exitCode));
    assert(elapsed >= 4800 && elapsed <= 7500, `Terminated within 5000ms window (actual: ${elapsed}ms)`);
    console.log(`     Terminated after: ${elapsed}ms`);

    // Test 4: Verify audit records in execution_jobs table
    console.log('\n7. Test: Database audit records in execution_jobs table...');
    const dbAudit = await query(
      `SELECT id, status, exit_code, language FROM execution_jobs WHERE project_id = $1 ORDER BY created_at ASC`,
      [projectId]
    );

    assert(dbAudit.rows.length === 3, 'Audit rows count is 3', `Found ${dbAudit.rows.length}`);
    const completedJob = dbAudit.rows[0];
    const timeoutJob = dbAudit.rows[2];
    assert(completedJob.status === 'completed', 'First job marked completed in DB', completedJob.status);
    assert(completedJob.exit_code === 0, 'First job exit code 0 in DB', String(completedJob.exit_code));
    assert(timeoutJob.status === 'timeout', 'Infinite loop job marked timeout in DB', timeoutJob.status);
    assert(timeoutJob.exit_code === 137, 'Infinite loop job exit code 137 in DB', String(timeoutJob.exit_code));

    console.log('\n=============================================================');
    console.log(`   Execution Test Results: ${passed} Passed, ${failed} Failed   `);
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

runExecutionTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
