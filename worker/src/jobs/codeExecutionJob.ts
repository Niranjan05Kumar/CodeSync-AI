import { executeInSandbox, ExecutionResult } from '../sandbox/dockerRunner';
import { Pool } from 'pg';

export interface CodeExecutionJobData {
  jobId: string;
  projectId: string;
  userId: string;
  language: string;
  code: string;
  stdin?: string;
}

export async function processCodeExecutionJob(
  data: CodeExecutionJobData,
  pool?: Pool
): Promise<ExecutionResult> {
  const { jobId, projectId, userId, language, code, stdin } = data;

  // 1. Run in sandbox with mandatory security flags and timeout
  const result = await executeInSandbox({
    jobId,
    language,
    code,
    stdin
  });

  // 2. Persist audit log in PostgreSQL if pool is provided
  if (pool) {
    try {
      await pool.query(
        `INSERT INTO execution_jobs (
           id, project_id, user_id, language, code, stdin, stdout, stderr, exit_code, execution_time_ms, memory_used_bytes, status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE SET
           stdout = EXCLUDED.stdout,
           stderr = EXCLUDED.stderr,
           exit_code = EXCLUDED.exit_code,
           execution_time_ms = EXCLUDED.execution_time_ms,
           memory_used_bytes = EXCLUDED.memory_used_bytes,
           status = EXCLUDED.status`,
        [
          jobId,
          projectId,
          userId,
          language,
          code,
          stdin || '',
          result.stdout,
          result.stderr,
          result.exitCode,
          result.executionTimeMs,
          result.memoryUsedBytes,
          result.status
        ]
      );
    } catch (dbErr) {
      console.warn(`[ExecutionJob] Warning: Failed to record audit log for job ${jobId}:`, dbErr);
    }
  }

  return result;
}
