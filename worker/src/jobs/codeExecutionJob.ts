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

  return result;
}
