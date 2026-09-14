import { create } from 'zustand';
import { User, AuthTokens } from '../types';
import { authApi } from '../api/authApi';
import { useProjectStore } from './useProjectStore';
import { updateSocketAuthToken, disconnectSocket } from '../sockets/socketClient';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  setAuth: (user: User, tokens: AuthTokens) => void;
  logout: () => void;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: localStorage.getItem('codesync_access_token'),
  isAuthenticated: !!localStorage.getItem('codesync_access_token'),
  isLoading: true,

  login: async (email, password) => {
    const res = await authApi.login({ email, password });
    get().setAuth(res.user, res.tokens);
  },

  register: async (username, email, password) => {
    const res = await authApi.register({ username, email, password });
    get().setAuth(res.user, res.tokens);
  },

  setAuth: (user, tokens) => {
    localStorage.setItem('codesync_access_token', tokens.accessToken);
    localStorage.setItem('codesync_refresh_token', tokens.refreshToken);
    set({
      user,
      accessToken: tokens.accessToken,
      isAuthenticated: true,
      isLoading: false
    });
    updateSocketAuthToken(tokens.accessToken);
    // Immediately fetch projects & files for the newly authenticated user
    useProjectStore.getState().fetchProjects();
  },

  logout: () => {
    localStorage.removeItem('codesync_access_token');
    localStorage.removeItem('codesync_refresh_token');
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false
    });
    disconnectSocket();
    // Clean up all projects, file trees, tabs, and collaborator state from UI
    useProjectStore.getState().resetProjectStore();
  },

  initAuth: async () => {
    const token = localStorage.getItem('codesync_access_token');
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      useProjectStore.getState().resetProjectStore();
      return;
    }

    try {
      const data = await authApi.getMe();
      set({
        user: data.user,
        isAuthenticated: true,
        isLoading: false
      });
      // Fetch projects once authentication is confirmed
      useProjectStore.getState().fetchProjects();
    } catch {
      localStorage.removeItem('codesync_access_token');
      localStorage.removeItem('codesync_refresh_token');
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false
      });
      disconnectSocket();
      useProjectStore.getState().resetProjectStore();
    }
  }
}));
