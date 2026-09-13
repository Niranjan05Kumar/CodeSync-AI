import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from server root or parent directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('[Database] WARNING: DATABASE_URL is not defined in environment variables.');
}

// Determine if SSL is required (e.g. Supabase, Neon, AWS RDS, or explicit sslmode)
const isCloudDatabase = 
  connectionString?.includes('supabase.co') || 
  connectionString?.includes('neon.tech') ||
  connectionString?.includes('sslmode=require') ||
  process.env.NODE_ENV === 'production';

const poolConfig: PoolConfig = {
  connectionString,
  max: 20,                          // Maximum connection pool capacity
  idleTimeoutMillis: 30000,         // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000,   // Return an error after 10 seconds if connection cannot be established
  ssl: isCloudDatabase ? { rejectUnauthorized: false } : false
};

export const pool = new Pool(poolConfig);

// Pool-level error handler to catch unexpected backend socket drops
pool.on('error', (err) => {
  console.error('[Database Pool] Unexpected idle client error:', err.message);
});

/**
 * Standardized parameterized query helper
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (process.env.DEBUG_SQL === 'true') {
      console.log(`[SQL] Executed query in ${duration}ms: ${text.slice(0, 100)}`);
    }
    return res;
  } catch (error: any) {
    console.error(`[SQL Error] Query failed: ${text.slice(0, 100)} | Error: ${error.message}`);
    throw error;
  }
}

/**
 * Health check to verify database connectivity and extension status
 */
export async function checkDatabaseHealth(): Promise<{
  ok: boolean;
  version?: string;
  hasVector?: boolean;
  hasUuid?: boolean;
  latencyMs?: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    const versionRes = await pool.query('SELECT version();');
    const extRes = await pool.query(`
      SELECT extname FROM pg_extension WHERE extname IN ('vector', 'uuid-ossp');
    `);
    
    const installedExtensions = extRes.rows.map((r: any) => r.extname);
    const latencyMs = Date.now() - start;

    return {
      ok: true,
      version: versionRes.rows[0]?.version,
      hasVector: installedExtensions.includes('vector'),
      hasUuid: installedExtensions.includes('uuid-ossp'),
      latencyMs
    };
  } catch (error: any) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: error.message
    };
  }
}

/**
 * Clean pool shutdown
 */
export async function closePool(): Promise<void> {
  await pool.end();
  console.log('[Database Pool] All connections successfully terminated.');
}

export default pool;
