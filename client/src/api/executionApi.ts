import { request } from './client';

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
  memoryUsedBytes: number;
  status: 'completed' | 'failed' | 'timeout';
}

export interface ExecuteParams {
  projectId: string;
  language: string;
  code: string;
  stdin?: string;
}

export const executionApi = {
  execute: (payload: ExecuteParams) => {
    return request<{ success: boolean; data: ExecutionResult }>('/execute', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};
