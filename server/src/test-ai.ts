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

function makeStreamRequest(
  server: http.Server,
  path: string,
  body: any,
  token: string
): Promise<{ chunks: string[]; fullText: string; isDone: boolean }> {
  const address = server.address() as any;
  const port = address.port;

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const options: http.RequestOptions = {
      hostname: '127.0.0.1',
      port,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        Authorization: `Bearer ${token}`
      }
    };

    const chunks: string[] = [];
    let fullText = '';
    let isDone = false;

    const req = http.request(options, (res) => {
      res.on('data', (chunk) => {
        const raw = chunk.toString('utf8');
        chunks.push(raw);
        const lines = raw.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const payload = line.replace('data: ', '').trim();
            if (payload === '[DONE]') {
              isDone = true;
            } else {
              try {
                const parsed = JSON.parse(payload);
                if (parsed.text) fullText += parsed.text;
              } catch {}
            }
          }
        }
      });

      res.on('end', () => {
        resolve({ chunks, fullText, isDone });
      });
    });

    req.on('error', (err) => reject(err));
    req.write(postData);
    req.end();
  });
}

async function runAiTests() {
  console.log('\n=============================================================');
  console.log('       CodeSync AI - Phase 7 Basic AI Assistant Suite        ');
  console.log('=============================================================\n');

  console.log('1. Checking database connection...');
  const health = await checkDatabaseHealth();
  if (!health.ok) {
    console.error('❌ Database health check failed:', health.error);
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
    // 1. Authenticate user
    console.log('2. Authenticating test user for AI assistant...');
    const uniqueId = Date.now().toString().slice(-6);
    const regRes = await makeRequest(server, 'POST', '/api/v1/auth/register', {
      username: `ai_tester_${uniqueId}`,
      email: `ai_tester_${uniqueId}@example.com`,
      password: 'Password123!',
      fullName: 'AI Assistant Tester'
    });

    assert(regRes.status === 201, 'Register test user for AI testing');
    const token = regRes.data.data.tokens.accessToken;

    // 2. Create test project
    console.log('\n3. Creating project context...');
    const projRes = await makeRequest(server, 'POST', '/api/v1/projects', {
      name: 'AI Test Project',
      template: 'python'
    }, token);

    assert(projRes.status === 201, 'Create test project for AI testing');
    const projectId = projRes.data.data.project.id;

    // 3. Test: Code Review endpoint
    console.log('\n4. Test: Structured Code Review (POST /api/v1/ai/review)...');
    const reviewRes = await makeRequest(server, 'POST', '/api/v1/ai/review', {
      projectId,
      filePath: 'src/auth.py',
      code: `def verify_token(token):\n    return jwt.decode(token, verify=False)\n`,
      language: 'python'
    }, token);

    assert(reviewRes.status === 200, 'Code review returns HTTP 200', JSON.stringify(reviewRes.data));
    assert(typeof reviewRes.data.data?.summary === 'string', 'Review summary returned');
    assert(Array.isArray(reviewRes.data.data?.issues), 'Review issues array returned');

    const issues = reviewRes.data.data?.issues || [];
    const securityIssue = issues.find((i: any) => i.type === 'SECURITY' && i.severity === 'CRITICAL');
    assert(!!securityIssue, 'Critical security issue detected (verify=False)', JSON.stringify(issues));
    assert(Array.isArray(securityIssue?.lineRange) && securityIssue.lineRange.length === 2, 'Line range is valid tuple');
    assert(typeof securityIssue?.suggestedFix === 'string' && securityIssue.suggestedFix.length > 0, 'Suggested fix provided');

    // 4. Test: Code Debugging endpoint
    console.log('\n5. Test: Code Debugging (POST /api/v1/ai/debug)...');
    const debugRes = await makeRequest(server, 'POST', '/api/v1/ai/debug', {
      code: `def parse_data(items):\n    return items['user']['id']\n`,
      errorMessage: "TypeError: 'NoneType' object is not subscriptable",
      language: 'python'
    }, token);

    assert(debugRes.status === 200, 'Code debug returns HTTP 200', JSON.stringify(debugRes.data));
    assert(typeof debugRes.data.data?.explanation === 'string', 'Debug explanation returned');
    assert(typeof debugRes.data.data?.rootCause === 'string', 'Root cause identified');
    assert(typeof debugRes.data.data?.fixedCode === 'string', 'Fixed code generated');
    assert(Array.isArray(debugRes.data.data?.steps) && debugRes.data.data.steps.length > 0, 'Debug resolution steps provided');

    // 5. Test: Code Explanation endpoint
    console.log('\n6. Test: Code Explanation (POST /api/v1/ai/explain)...');
    const explainRes = await makeRequest(server, 'POST', '/api/v1/ai/explain', {
      code: `
        function binarySearch(arr, target) {
          let left = 0, right = arr.length - 1;
          while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            if (arr[mid] === target) return mid;
            if (arr[mid] < target) left = mid + 1;
            else right = mid - 1;
          }
          return -1;
        }
      `,
      language: 'javascript',
      detailLevel: 'detailed'
    }, token);

    assert(explainRes.status === 200, 'Code explain returns HTTP 200', JSON.stringify(explainRes.data));
    assert(typeof explainRes.data.data?.overview === 'string', 'Overview returned');
    assert(Array.isArray(explainRes.data.data?.components), 'Components array returned');
    assert(typeof explainRes.data.data?.complexity?.time === 'string', 'Time complexity estimated');
    assert(typeof explainRes.data.data?.explanation === 'string', 'Explanation body returned');

    // 6. Test: Streaming AI Chat (SSE)
    console.log('\n7. Test: Streaming AI Chat (POST /api/v1/ai/chat)...');
    const streamResult = await makeStreamRequest(server, '/api/v1/ai/chat', {
      messages: [
        { role: 'user', content: 'Explain what this file does in 2 sentences.' }
      ],
      activeFile: {
        path: 'src/main.ts',
        language: 'typescript',
        content: 'export function calculateTotal(prices: number[]): number { return prices.reduce((a, b) => a + b, 0); }'
      }
    }, token);

    assert(streamResult.chunks.length > 0, 'Received SSE stream chunks', `Chunks count: ${streamResult.chunks.length}`);
    assert(streamResult.fullText.length > 10, 'Streamed meaningful assistant text', streamResult.fullText.slice(0, 80));
    assert(streamResult.isDone, 'Stream received [DONE] signal');

    // Cleanup
    await query(`DELETE FROM projects WHERE id = $1`, [projectId]);
    await query(`DELETE FROM users WHERE email = $1`, [`ai_tester_${uniqueId}@example.com`]);

    console.log('\n=============================================================');
    console.log(`     AI Assistant Test Results: ${passed} Passed, ${failed} Failed     `);
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

runAiTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
