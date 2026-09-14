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

    // 2. Execute in sandbox (Dockerode with security flags or resilient fallback)
    const result = await executeInSandbox({
      jobId,
      language,
      code,
      stdin
    });

    // 3. Broadcast execution completion to room via Socket.IO if initialized
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
