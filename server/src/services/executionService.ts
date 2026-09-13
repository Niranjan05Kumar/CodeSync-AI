import crypto from 'crypto';
import { query } from '../db/pool';
import { ApiError } from '../utils/apiError';
import { executeInSandbox, ExecutionResult } from './sandboxRunner';
import { getIO } from '../sockets/socketServer';

export interface ExecuteParams {
  projectId: string;
  userId: string;
  language: string;
  code: string;
  stdin?: string;
}

export const executionService = {
  async runCode(params: ExecuteParams): Promise<ExecutionResult> {
    const { projectId, userId, language, code, stdin = '' } = params;

    // 1. Verify project exists
    const projRes = await query(
      `SELECT id, owner_id, is_public FROM projects WHERE id = $1`,
      [projectId]
    );
    if (projRes.rows.length === 0) {
      throw ApiError.notFound('Project not found', 'PROJECT_NOT_FOUND');
    }

    const jobId = crypto.randomUUID();

    // 2. Insert execution audit record into PostgreSQL
    await query(
      `INSERT INTO execution_jobs (
         id, project_id, user_id, language, code, stdin, status
       ) VALUES ($1, $2, $3, $4, $5, $6, 'running')`,
      [jobId, projectId, userId, language, code, stdin]
    );

    // 3. Execute in sandbox (Dockerode with security flags or resilient fallback)
    const result = await executeInSandbox({
      jobId,
      language,
      code,
      stdin
    });

    // 4. Update audit record with final metrics and outputs
    await query(
      `UPDATE execution_jobs SET
         stdout = $1,
         stderr = $2,
         exit_code = $3,
         execution_time_ms = $4,
         memory_used_bytes = $5,
         status = $6
       WHERE id = $7`,
      [
        result.stdout,
        result.stderr,
        result.exitCode,
        result.executionTimeMs,
        result.memoryUsedBytes,
        result.status,
        jobId
      ]
    );

    // 5. Broadcast execution completion to room via Socket.IO if initialized
    try {
      const io = getIO();
      io.to(`project:${projectId}`).emit('execution:result', {
        jobId,
        userId,
        result
      });
    } catch {
      // Socket server might not have client in room, continue
    }

    return result;
  }
};
