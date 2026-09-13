import { request } from './client';
import { User, AuthTokens } from '../types';

export const authApi = {
  register: (payload: { email: string; username: string; password: string }) => {
    return request<{ user: User; tokens: AuthTokens }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  login: (payload: { email: string; password: string }) => {
    return request<{ user: User; tokens: AuthTokens }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  getMe: () => {
    return request<{ user: User }>('/auth/me', {
      method: 'GET'
    });
  }
};
