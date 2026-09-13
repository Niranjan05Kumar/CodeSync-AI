import { request } from './client';
import { FileTreeNode } from '../types';

export const fileApi = {
  getProjectTree: (projectId: string) => {
    return request<{ tree: FileTreeNode[] }>(`/projects/${projectId}/tree`, {
      method: 'GET'
    });
  },

  getFileContent: (projectId: string, fileId: string) => {
    return request<{ file: { id: string; content: string; language: string; version: number; path: string; name: string } }>(
      `/projects/${projectId}/files/${fileId}`,
      { method: 'GET' }
    );
  },

  createFileOrFolder: (
    projectId: string,
    payload: { name: string; parentId?: string | null; isDirectory?: boolean; content?: string }
  ) => {
    return request<{ file: FileTreeNode }>(`/projects/${projectId}/files`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  updateFileContent: (projectId: string, fileId: string, content: string, version?: number) => {
    return request<{ file: { id: string; version: number; size_bytes: number; updated_at: string } }>(
      `/projects/${projectId}/files/${fileId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ content, version })
      }
    );
  },

  renameFileOrFolder: (projectId: string, fileId: string, name: string) => {
    return request<{ file: { id: string; name: string; path: string } }>(
      `/projects/${projectId}/files/${fileId}/rename`,
      {
        method: 'PATCH',
        body: JSON.stringify({ name })
      }
    );
  },

  deleteFileOrFolder: (projectId: string, fileId: string) => {
    return request<{ message: string; deletedFile: any }>(
      `/projects/${projectId}/files/${fileId}`,
      { method: 'DELETE' }
    );
  }
};
