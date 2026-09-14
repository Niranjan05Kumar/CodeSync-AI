import { request } from './client';
import { Project } from '../types';

export const projectApi = {
  getProjects: () => {
    return request<{ projects: Project[] }>('/projects', {
      method: 'GET'
    });
  },

  getProjectById: (id: string) => {
    return request<{ project: Project & { members: any[] } }>(`/projects/${id}`, {
      method: 'GET'
    });
  },

  createProject: (payload: { name: string; description?: string; isPublic?: boolean; template?: string }) => {
    return request<{ project: Project }>('/projects', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  deleteProject: (id: string) => {
    return request<{ message: string; deletedId: string }>(`/projects/${id}`, {
      method: 'DELETE'
    });
  },

  joinProject: (roomCode: string) => {
    return request<{ project: Project }>('/projects/join', {
      method: 'POST',
      body: JSON.stringify({ roomCode })
    });
  },

  inviteMember: (projectId: string, emailOrUsername: string, role: 'editor' | 'viewer' = 'editor') => {
    return request<{ member: any }>(`/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify({ emailOrUsername, role })
    });
  },

  removeMember: (projectId: string, userId: string) => {
    return request<{ message: string; removedUserId: string }>(`/projects/${projectId}/members/${userId}`, {
      method: 'DELETE'
    });
  }
};
