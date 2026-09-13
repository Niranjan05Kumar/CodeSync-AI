import http from 'http';
import express, { Request, Response } from 'express';
import { createApp } from './app';
import { createRateLimiter } from './middlewares/rateLimiter';
import { errorHandler } from './middlewares/errorHandler';

// Helper to make HTTP requests against local Express test server
function makeRequest(
  server: http.Server,
  method: string,
  path: string,
  body?: any,
  headers: Record<string, string> = {}
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
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let rawData = '';
      res.on('data', (chunk) => {
        rawData += chunk;
      });
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

async function runHardeningTests() {
  console.log('\n======================================================');
  console.log('   CodeSync AI - Phase 9 Security Hardening Suite   ');
  console.log('======================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      throw new Error(`Assertion failed: ${testName}`);
    }
  }

  // 1. Create main app server on ephemeral port
  const mainApp = createApp();
  const mainServer = http.createServer(mainApp);
  await new Promise<void>((resolve) => mainServer.listen(0, resolve));
  const mainPort = (mainServer.address() as any).port;
  console.log(`[Test Server] Main app listening on port ${mainPort}`);

  try {
    // --------------------------------------------------------------------------
    // Test Group 1: Helmet HTTP Security Headers
    // --------------------------------------------------------------------------
    console.log('\n--- 1. Helmet Security Headers ---');
    const healthRes = await makeRequest(mainServer, 'GET', '/api/v1/health');
    assert(healthRes.status === 200, 'Health endpoint responds with 200');

    // Verify security headers inserted by Helmet
    assert(healthRes.headers['x-content-type-options'] === 'nosniff', 'X-Content-Type-Options is nosniff');
    assert(healthRes.headers['x-dns-prefetch-control'] === 'off', 'X-DNS-Prefetch-Control is off');
    assert(
      healthRes.headers['cross-origin-resource-policy'] === 'cross-origin',
      'Cross-Origin-Resource-Policy is set to cross-origin'
    );
    assert(healthRes.headers['x-frame-options'] === 'SAMEORIGIN', 'X-Frame-Options is set to SAMEORIGIN');

    // --------------------------------------------------------------------------
    // Test Group 2: CORS Lockdown & Preflight
    // --------------------------------------------------------------------------
    console.log('\n--- 2. CORS Policy & Preflight ---');

    // Preflight OPTIONS test
    const preflightRes = await makeRequest(mainServer, 'OPTIONS', '/api/v1/health', null, {
      Origin: 'http://localhost:5173',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type,Authorization',
    });
    assert(preflightRes.status === 204 || preflightRes.status === 200, 'CORS Preflight returns 200/204');
    assert(
      preflightRes.headers['access-control-allow-origin'] === 'http://localhost:5173' ||
        preflightRes.headers['access-control-allow-origin'] === '*',
      'CORS Allow-Origin header present for trusted client'
    );
    assert(
      preflightRes.headers['access-control-allow-credentials'] === 'true',
      'CORS Allow-Credentials header enabled for session cookies/tokens'
    );

    // --------------------------------------------------------------------------
    // Test Group 3: Rate Limiting Enforcement (429 Too Many Requests)
    // --------------------------------------------------------------------------
    console.log('\n--- 3. Rate Limiting Throttling & Payload Format ---');

    // Build a dedicated sub-app with low-threshold rate limiter to test exact 429 triggering
    const testRateApp = express();
    const strictLimiter = createRateLimiter({
      windowMs: 60 * 1000,
      max: 3,
      message: 'Rate limit exceeded in test harness.',
      code: 'TEST_RATE_LIMIT_EXCEEDED',
    });

    testRateApp.get('/test-limit', strictLimiter, (_req: Request, res: Response) => {
      res.json({ success: true, message: 'allowed' });
    });

    const rateServer = http.createServer(testRateApp);
    await new Promise<void>((resolve) => rateServer.listen(0, resolve));

    // Send 3 requests (within limit)
    for (let i = 1; i <= 3; i++) {
      const res = await makeRequest(rateServer, 'GET', '/test-limit');
      assert(res.status === 200, `Request ${i}/3 within threshold allowed (200 OK)`);
    }

    // Send 4th request (triggers 429)
    const blockedRes = await makeRequest(rateServer, 'GET', '/test-limit');
    assert(blockedRes.status === 429, 'Request 4/3 triggers HTTP 429 Too Many Requests');
    assert(blockedRes.data.success === false, 'Rate limit response has success: false');
    assert(blockedRes.data.error.code === 'TEST_RATE_LIMIT_EXCEEDED', 'Returns code TEST_RATE_LIMIT_EXCEEDED');
    assert(
      blockedRes.data.error.message.includes('Rate limit exceeded'),
      'Returns descriptive rate limit error message'
    );

    // Check rate limit standard headers
    assert(
      blockedRes.headers['ratelimit-limit'] !== undefined || blockedRes.headers['retry-after'] !== undefined,
      'RateLimit or Retry-After standard header present'
    );

    rateServer.close();

    // --------------------------------------------------------------------------
    // Test Group 4: Standardized 404 Catch-All Handler
    // --------------------------------------------------------------------------
    console.log('\n--- 4. Catch-All 404 Handler ---');
    const notFoundRes = await makeRequest(mainServer, 'GET', '/api/v1/non-existent-route-xyz');
    assert(notFoundRes.status === 404, 'Unknown endpoint returns 404');
    assert(notFoundRes.data.success === false, 'Unknown endpoint returns success: false');
    assert(notFoundRes.data.error.code === 'ENDPOINT_NOT_FOUND', 'Returns code ENDPOINT_NOT_FOUND');

    // --------------------------------------------------------------------------
    // Test Group 5: Production Error Masking
    // --------------------------------------------------------------------------
    console.log('\n--- 5. Production Error Masking ---');

    const errTestApp = express();
    errTestApp.get('/crash', (_req: Request, _res: Response) => {
      throw new Error('Sensitive database credentials or internal stack trace');
    });
    errTestApp.use(errorHandler);

    const errServer = http.createServer(errTestApp);
    await new Promise<void>((resolve) => errServer.listen(0, resolve));

    // Save previous NODE_ENV
    const prevEnv = process.env.NODE_ENV;

    // Test in development / test mode
    process.env.NODE_ENV = 'development';
    const devErrRes = await makeRequest(errServer, 'GET', '/crash');
    assert(devErrRes.status === 500, 'Development unhandled exception returns 500');
    assert(
      devErrRes.data.error.message.includes('Sensitive database credentials'),
      'Development reveals error message for debugging'
    );

    // Test in production mode: must mask sensitive error
    process.env.NODE_ENV = 'production';
    const prodErrRes = await makeRequest(errServer, 'GET', '/crash');
    assert(prodErrRes.status === 500, 'Production unhandled exception returns 500');
    assert(
      prodErrRes.data.error.message === 'Internal server error',
      'Production masks error with generic "Internal server error"'
    );
    assert(
      !JSON.stringify(prodErrRes.data).includes('Sensitive database credentials'),
      'Production leaks zero sensitive internal exception details'
    );

    // Restore original env
    process.env.NODE_ENV = prevEnv;
    errServer.close();

    console.log('\n======================================================');
    console.log(`🎉 ALL ${passedTests}/${totalTests} HARDENING TESTS PASSED! PHASE 9 PRODUCTION HARDENING VERIFIED!`);
    console.log('======================================================\n');
  } finally {
    mainServer.close();
  }
}

runHardeningTests().catch((err) => {
  console.error('Fatal hardening test failure:', err);
  process.exit(1);
});
