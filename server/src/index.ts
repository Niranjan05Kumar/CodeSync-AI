import dotenv from 'dotenv';
import path from 'path';

// Load environment configuration
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { app } from './app';
import { checkDatabaseHealth, closePool } from './db/pool';

const PORT = parseInt(process.env.PORT || '5000', 10);

async function startServer() {
  console.log('\n======================================================');
  console.log('   CodeSync AI - Backend API Server Bootstrapping     ');
  console.log('======================================================\n');

  // Verify database connectivity on startup
  console.log('[1/2] Connecting to PostgreSQL database...');
  const health = await checkDatabaseHealth();

  if (!health.ok) {
    console.error('❌ Database connection failed:', health.error);
    console.error('👉 Please verify your DATABASE_URL credentials in server/.env');
    process.exit(1);
  }

  console.log(`✅ Database connected (${health.latencyMs}ms)`);
  console.log(`   pgvector extension: ${health.hasVector ? 'Active ✅' : 'Missing ❌'}`);

  // Start HTTP listener
  console.log('[2/2] Starting Express HTTP server...');
  const server = app.listen(PORT, () => {
    console.log(`\n🚀 CodeSync AI API Server running at http://localhost:${PORT}`);
    console.log(`   Health Check: http://localhost:${PORT}/api/v1/health`);
    console.log(`   Environment:  ${process.env.NODE_ENV || 'development'}\n`);
  });

  // Graceful shutdown handlers
  const shutdown = async (signal: string) => {
    console.log(`\n[Server] Received ${signal}. Initiating graceful shutdown...`);
    server.close(async () => {
      console.log('[Server] HTTP listener closed.');
      await closePool();
      console.log('[Server] Shutdown complete.');
      process.exit(0);
    });

    // Force shutdown after 10s if hanging
    setTimeout(() => {
      console.error('[Server] Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('[Fatal Error during startup]:', err);
  process.exit(1);
});
