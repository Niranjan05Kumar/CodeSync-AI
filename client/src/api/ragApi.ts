import { request } from './client';

export interface CitedSource {
  filePath: string;
  startLine: number;
  endLine: number;
  similarityScore: number;
  chunkContent?: string;
}

export interface RAGQueryResult {
  answer: string;
  citedSources: CitedSource[];
}

export interface RAGSyncResult {
  indexedFiles: number;
  totalChunks: number;
}

export const ragApi = {
  syncProjectVectors: (projectId: string) => {
    return request<RAGSyncResult>('/rag/sync', {
      method: 'POST',
      body: JSON.stringify({ projectId })
    });
  },

  queryRAG: (payload: {
    projectId: string;
    query: string;
    limit?: number;
    minSimilarity?: number;
  }) => {
    return request<RAGQueryResult>('/rag/query', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};
