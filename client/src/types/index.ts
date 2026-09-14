export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url?: string | null;
  created_at?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface Project {
  id: string;
  name: string;
  roomCode?: string;
  room_code?: string;
  description?: string | null;
  owner_id: string;
  owner_username?: string;
  is_public: boolean;
  role?: 'owner' | 'editor' | 'viewer';
  member_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  userId: string;
  username: string;
  email: string;
  avatarUrl?: string | null;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt?: string;
}

export interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  isDirectory: boolean;
  language?: string;
  sizeBytes?: number;
  version?: number;
  updatedAt?: string;
  children?: FileTreeNode[];
}

export interface EditorTab {
  id: string;          // File ID
  name: string;
  path: string;
  language: string;
  isUnsaved?: boolean;
}

export interface Collaborator {
  id: string;
  username: string;
  color: string;
  cursorPosition?: {
    lineNumber: number;
    column: number;
  };
  activeFileId?: string;
}

export interface MonacoChange {
  range: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
  rangeOffset: number;
  rangeLength: number;
  text: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  color: string;
  message: string;
  createdAt: string;
}
