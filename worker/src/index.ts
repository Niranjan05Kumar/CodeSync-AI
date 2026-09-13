import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { Worker, Job } from 'bullmq';
import { Pool } from 'pg';
import { processCodeExecutionJob, CodeExecutionJobData } from './jobs/codeExecutionJob';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const DATABASE_URL = process.env.DATABASE_URL;

const pool = DATABASE_URL
  ? new Pool({ connectionString: DATABASE_URL, ssl: DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : undefined })
  : undefined;

console.log('\n======================================================');
console.log('   CodeSync AI - Sandboxed Worker Process Starting    ');
console.log('======================================================\n');

try {
  const executionWorker = new Worker<CodeExecutionJobData>(
    'code-execution',
    async (job: Job<CodeExecutionJobData>) => {
      console.log(`[Worker] Processing execution job ${job.id} for project ${job.data.projectId} (${job.data.language})...`);
      const result = await processCodeExecutionJob(job.data, pool);
      console.log(`[Worker] Job ${job.id} completed: status=${result.status}, time=${result.executionTimeMs}ms, exitCode=${result.exitCode}`);
      return result;
    },
    {
      connection: {
        url: REDIS_URL
      },
      concurrency: 5
    }
  );

  executionWorker.on('completed', (job) => {
    console.log(`✅ [Worker] Job ${job.id} finished successfully`);
  });

  executionWorker.on('failed', (job, err) => {
    console.error(`❌ [Worker] Job ${job?.id} failed:`, err);
  });

  console.log(`🚀 [Worker] Listening for jobs on BullMQ queue 'code-execution' (Redis: ${REDIS_URL})`);
} catch (err: any) {
  console.warn(`[Worker] BullMQ Worker initialization warning: ${err.message}`);
}
