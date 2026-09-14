import { create } from 'zustand';
import { Project, FileTreeNode, EditorTab, Collaborator, ChatMessage } from '../types';
import { projectApi } from '../api/projectApi';
import { fileApi } from '../api/fileApi';
import { executionApi, ExecutionResult } from '../api/executionApi';
import { useUIStore } from './useUIStore';

export interface ExecutionLogItem {
  id: string;
  type: 'system' | 'stdout' | 'stderr' | 'success' | 'error';
  text: string;
  timestamp: string;
}

interface ProjectState {
  currentProject: Project | null;
  projects: Project[];
  fileTree: FileTreeNode[];
  openTabs: EditorTab[];
  activeTabId: string | null;
  activeFileContent: string;
  activeFileVersion: number;
  unsavedFileIds: string[];
  isTreeLoading: boolean;
  isFileLoading: boolean;
  collaborators: Collaborator[];
  chatMessages: ChatMessage[];

  // Code execution state
  isExecuting: boolean;
  executionResult: ExecutionResult | null;
  executionLogs: ExecutionLogItem[];
  runActiveFile: () => Promise<void>;
  clearExecutionOutput: () => void;

  fetchProjects: () => Promise<void>;
  selectProject: (project: Project) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  refreshTree: () => Promise<void>;

  openFile: (file: { id: string; name: string; path: string; language: string }) => Promise<void>;
  openFileByPath: (filePath: string) => Promise<void>;
  closeTab: (fileId: string) => void;
  setActiveTabId: (fileId: string) => Promise<void>;

  updateActiveContent: (content: string) => void;
  saveActiveFile: () => Promise<void>;

  // Real-time synchronization actions
  setCollaborators: (collabs: Collaborator[]) => void;
  updateCollaboratorCursor: (userId: string, position: { lineNumber: number; column: number }, fileId: string, username?: string, color?: string) => void;
  removeCollaborator: (userId: string) => void;
  setChatMessages: (msgs: ChatMessage[]) => void;
  addChatMessage: (msg: ChatMessage) => void;
  clearChatMessages: () => void;
  deleteChatMessage: (messageId: string) => void;
  joinRoom: (roomCodeOrUrl: string) => Promise<Project>;
  inviteMember: (emailOrUsername: string, role?: 'editor' | 'viewer') => Promise<any>;
  removeMember: (userId: string) => Promise<void>;
  resetProjectStore: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  currentProject: null,
  projects: [],
  fileTree: [],
  openTabs: [],
  activeTabId: null,
  activeFileContent: '',
  activeFileVersion: 1,
  unsavedFileIds: [],
  isTreeLoading: false,
  isFileLoading: false,
  collaborators: [],
  chatMessages: [],

  // Execution initial state
  isExecuting: false,
  executionResult: null,
  executionLogs: [
    {
      id: 'init-1',
      type: 'system',
      text: 'CodeSync Sandboxed Execution Engine ready.',
      timestamp: new Date().toLocaleTimeString()
    }
  ],

  setCollaborators: (collaborators) => set({ collaborators }),

  updateCollaboratorCursor: (userId, position, fileId, username, color) => {
    const { collaborators } = get();
    const existingIndex = collaborators.findIndex((c) => c.id === userId);

    if (existingIndex >= 0) {
      const updated = [...collaborators];
      updated[existingIndex] = {
        ...updated[existingIndex],
        cursorPosition: position,
        activeFileId: fileId,
        color: color || updated[existingIndex].color
      };
      set({ collaborators: updated });
    } else if (username) {
      set({
        collaborators: [
          ...collaborators,
          {
            id: userId,
            username,
            color: color || '#4fc1ff',
            cursorPosition: position,
            activeFileId: fileId
          }
        ]
      });
    }
  },

  removeCollaborator: (userId) => {
    set((s) => ({
      collaborators: s.collaborators.filter((c) => c.id !== userId)
    }));
  },

  setChatMessages: (chatMessages) => set({ chatMessages }),

  addChatMessage: (msg) => set((s) => {
    if (msg.id && s.chatMessages.some((m) => m.id === msg.id)) {
      return s;
    }
    return { chatMessages: [...s.chatMessages, msg] };
  }),

  clearChatMessages: () => set({ chatMessages: [] }),

  deleteChatMessage: (messageId) => set((s) => ({
    chatMessages: s.chatMessages.filter((m) => m.id !== messageId)
  })),

  joinRoom: async (roomCodeOrUrl: string) => {
    let cleanCode = roomCodeOrUrl.trim();

    // If full URL was pasted, extract room parameter or path
    if (cleanCode.includes('?room=')) {
      const match = cleanCode.match(/[?&]room=([^&#]+)/);
      if (match && match[1]) {
        cleanCode = match[1];
      }
    } else if (cleanCode.includes('/')) {
      const parts = cleanCode.split('/');
      cleanCode = parts[parts.length - 1];
    }

    cleanCode = cleanCode.trim().toUpperCase();

    const res = await projectApi.joinProject(cleanCode);
    const joinedProject = res.project;

    // Update project list
    const currentList = get().projects;
    const exists = currentList.some((p) => p.id === joinedProject.id);
    if (!exists) {
      set({ projects: [joinedProject, ...currentList] });
    } else {
      set({
        projects: currentList.map((p) => (p.id === joinedProject.id ? { ...p, ...joinedProject } : p))
      });
    }

    // Immediately select the joined project to mount files and join the Socket.IO room
    await get().selectProject(joinedProject);
    return joinedProject;
  },

  inviteMember: async (emailOrUsername: string, role: 'editor' | 'viewer' = 'editor') => {
    const proj = get().currentProject;
    if (!proj) throw new Error('No active project selected');
    const res = await projectApi.inviteMember(proj.id, emailOrUsername, role);
    return res.member;
  },

  removeMember: async (userId: string) => {
    const proj = get().currentProject;
    if (!proj) throw new Error('No active project selected');
    await projectApi.removeMember(proj.id, userId);
  },

  resetProjectStore: () => {
    set({
      currentProject: null,
      projects: [],
      fileTree: [],
      openTabs: [],
      activeTabId: null,
      activeFileContent: '',
      activeFileVersion: 1,
      unsavedFileIds: [],
      isTreeLoading: false,
      collaborators: [],
      chatMessages: [],
      isExecuting: false,
      executionResult: null,
      executionLogs: []
    });
  },

  fetchProjects: async () => {
    try {
      const data = await projectApi.getProjects();
      set({ projects: data.projects });
      if (!get().currentProject && data.projects.length > 0) {
        await get().selectProject(data.projects[0]);
      }
    } catch (err) {
      console.error('[ProjectStore] Failed to fetch projects:', err);
    }
  },

  selectProject: async (project: Project) => {
    set({
      currentProject: project,
      openTabs: [],
      activeTabId: null,
      activeFileContent: '',
      unsavedFileIds: [],
      isTreeLoading: true
    });

    try {
      const treeData = await fileApi.getProjectTree(project.id);
      set({ fileTree: treeData.tree, isTreeLoading: false });

      // Automatically open the first code file or README.md if found
      const firstFile = findFirstCodeFile(treeData.tree);
      if (firstFile) {
        await get().openFile(firstFile);
      }
    } catch (err) {
      console.error('[ProjectStore] Failed to load project tree:', err);
      set({ isTreeLoading: false });
    }
  },

  deleteProject: async (projectId: string) => {
    await projectApi.deleteProject(projectId);
    const { projects, currentProject } = get();
    const remaining = projects.filter((p) => p.id !== projectId);
    set({ projects: remaining });

    if (currentProject?.id === projectId) {
      if (remaining.length > 0) {
        await get().selectProject(remaining[0]);
      } else {
        set({
          currentProject: null,
          fileTree: [],
          openTabs: [],
          activeTabId: null,
          activeFileContent: '',
          unsavedFileIds: []
        });
      }
    }
  },

  refreshTree: async () => {
    const project = get().currentProject;
    if (!project) return;
    try {
      const treeData = await fileApi.getProjectTree(project.id);
      set({ fileTree: treeData.tree });
    } catch (err) {
      console.error('[ProjectStore] Failed to refresh tree:', err);
    }
  },

  openFile: async (file) => {
    const { openTabs, currentProject } = get();
    if (!currentProject) return;

    // Add tab if not already open
    if (!openTabs.some((t) => t.id === file.id)) {
      set({
        openTabs: [
          ...openTabs,
          {
            id: file.id,
            name: file.name,
            path: file.path,
            language: file.language
          }
        ]
      });
    }

    set({ activeTabId: file.id, isFileLoading: true });

    // Fetch active content
    try {
      const data = await fileApi.getFileContent(currentProject.id, file.id);
      set({
        activeFileContent: data.file.content,
        activeFileVersion: data.file.version,
        isFileLoading: false
      });
    } catch (err) {
      console.error('[ProjectStore] Failed to fetch file content:', err);
      set({ isFileLoading: false });
    }
  },

  openFileByPath: async (filePath: string) => {
    const { fileTree, openFile } = get();
    const findNode = (nodes: FileTreeNode[]): FileTreeNode | null => {
      for (const node of nodes) {
        if (!node.isDirectory && (node.path === filePath || node.name === filePath)) {
          return node;
        }
        if (node.children) {
          const found = findNode(node.children);
          if (found) return found;
        }
      }
      return null;
    };

    const target = findNode(fileTree);
    if (target) {
      await openFile({
        id: target.id,
        name: target.name,
        path: target.path,
        language: target.language || 'plaintext'
      });
    }
  },

  closeTab: (fileId) => {
    const { openTabs, activeTabId } = get();
    const newTabs = openTabs.filter((t) => t.id !== fileId);
    let nextActiveId = activeTabId;

    if (activeTabId === fileId) {
      const closedIndex = openTabs.findIndex((t) => t.id === fileId);
      if (newTabs.length > 0) {
        const nextIndex = Math.min(closedIndex, newTabs.length - 1);
        nextActiveId = newTabs[nextIndex].id;
      } else {
        nextActiveId = null;
      }
    }

    set({
      openTabs: newTabs,
      activeTabId: nextActiveId,
      unsavedFileIds: get().unsavedFileIds.filter((id) => id !== fileId)
    });

    if (nextActiveId) {
      const nextTab = newTabs.find((t) => t.id === nextActiveId);
      if (nextTab) {
        get().openFile(nextTab);
      }
    } else {
      set({ activeFileContent: '', activeFileVersion: 1 });
    }
  },

  setActiveTabId: async (fileId) => {
    const tab = get().openTabs.find((t) => t.id === fileId);
    if (tab) {
      await get().openFile(tab);
    }
  },

  updateActiveContent: (content: string) => {
    const { activeTabId, unsavedFileIds } = get();
    if (!activeTabId) return;

    set({
      activeFileContent: content,
      unsavedFileIds: unsavedFileIds.includes(activeTabId) ? unsavedFileIds : [...unsavedFileIds, activeTabId]
    });
  },

  saveActiveFile: async () => {
    const { currentProject, activeTabId, activeFileContent, activeFileVersion, unsavedFileIds } = get();
    if (!currentProject || !activeTabId) return;

    try {
      const res = await fileApi.updateFileContent(
        currentProject.id,
        activeTabId,
        activeFileContent,
        activeFileVersion
      );

      set({
        activeFileVersion: res.file.version,
        unsavedFileIds: unsavedFileIds.filter((id) => id !== activeTabId)
      });
      console.log(`[ProjectStore] File saved (version ${res.file.version})`);
    } catch (err) {
      console.error('[ProjectStore] Save file failed:', err);
    }
  },

  clearExecutionOutput: () => {
    set({
      executionLogs: [],
      executionResult: null
    });
  },

  runActiveFile: async () => {
    const { currentProject, openTabs, activeTabId, isExecuting } = get();
    if (isExecuting) return;

    // Switch BottomDock to OUTPUT tab and ensure panel is open
    useUIStore.getState().setActiveBottomTab('output');
    useUIStore.getState().setBottomPanelOpen(true);

    if (!currentProject) {
      set((s) => ({
        executionLogs: [
          ...s.executionLogs,
          {
            id: String(Date.now()),
            type: 'error',
            text: 'No active project selected to run.',
            timestamp: new Date().toLocaleTimeString()
          }
        ]
      }));
      return;
    }

    const activeTab = openTabs.find((t) => t.id === activeTabId);
    if (!activeTab) {
      set((s) => ({
        executionLogs: [
          ...s.executionLogs,
          {
            id: String(Date.now()),
            type: 'error',
            text: 'No file is open in editor to run.',
            timestamp: new Date().toLocaleTimeString()
          }
        ]
      }));
      return;
    }

    // Detect runtime language from file extension or tab language
    let language = activeTab.language || 'javascript';
    const lowerName = activeTab.name.toLowerCase();
    if (lowerName.endsWith('.py')) language = 'python';
    else if (lowerName.endsWith('.js') || lowerName.endsWith('.mjs')) language = 'javascript';
    else if (lowerName.endsWith('.ts')) language = 'typescript';
    else if (lowerName.endsWith('.cpp') || lowerName.endsWith('.c')) language = 'cpp';

    // Save active file before execution
    await get().saveActiveFile();

    const startTimestamp = new Date().toLocaleTimeString();
    set((s) => ({
      isExecuting: true,
      executionResult: null,
      executionLogs: [
        ...s.executionLogs,
        {
          id: `start-${Date.now()}`,
          type: 'system',
          text: `[Run] Executing ${activeTab.name} (${language}) in sandbox...`,
          timestamp: startTimestamp
        }
      ]
    }));

    try {
      const res = await executionApi.execute({
        projectId: currentProject.id,
        language,
        code: get().activeFileContent
      });

      // Handle both unwrapped and wrapped ExecutionResult structures
      const result: ExecutionResult = (res as any)?.data ?? res;
      if (!result || typeof result !== 'object') {
        throw new Error('No execution result returned from server');
      }

      const newItems: ExecutionLogItem[] = [];

      if (result.stdout) {
        newItems.push({
          id: `out-${Date.now()}`,
          type: 'stdout',
          text: result.stdout,
          timestamp: new Date().toLocaleTimeString()
        });
      }

      if (result.stderr) {
        newItems.push({
          id: `err-${Date.now()}`,
          type: 'stderr',
          text: result.stderr,
          timestamp: new Date().toLocaleTimeString()
        });
      }

      if (result.status === 'timeout') {
        newItems.push({
          id: `status-${Date.now()}`,
          type: 'error',
          text: `[Timeout] Process exceeded wall-clock timeout limit of 5000ms (SIGKILL enforced, exit code 137).`,
          timestamp: new Date().toLocaleTimeString()
        });
      } else if (result.exitCode === 0) {
        newItems.push({
          id: `status-${Date.now()}`,
          type: 'success',
          text: `[Completed] Finished with exit code 0 in ${result.executionTimeMs}ms.`,
          timestamp: new Date().toLocaleTimeString()
        });
      } else {
        newItems.push({
          id: `status-${Date.now()}`,
          type: 'error',
          text: `[Failed] Process exited with code ${result.exitCode} in ${result.executionTimeMs}ms.`,
          timestamp: new Date().toLocaleTimeString()
        });
      }

      set((s) => ({
        isExecuting: false,
        executionResult: result,
        executionLogs: [...s.executionLogs, ...newItems]
      }));
    } catch (err: any) {
      set((s) => ({
        isExecuting: false,
        executionLogs: [
          ...s.executionLogs,
          {
            id: `err-${Date.now()}`,
            type: 'error',
            text: `Execution failed: ${err.message || 'Unknown execution error'}`,
            timestamp: new Date().toLocaleTimeString()
          }
        ]
      }));
    }
  }
}));

function findFirstCodeFile(nodes: FileTreeNode[]): { id: string; name: string; path: string; language: string } | null {
  for (const node of nodes) {
    if (!node.isDirectory) {
      return {
        id: node.id,
        name: node.name,
        path: node.path,
        language: node.language || 'plaintext'
      };
    }
    if (node.children && node.children.length > 0) {
      const found = findFirstCodeFile(node.children);
      if (found) return found;
    }
  }
  return null;
}
