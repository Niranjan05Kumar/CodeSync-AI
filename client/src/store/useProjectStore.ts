import { create } from 'zustand';
import { Project, FileTreeNode, EditorTab, Collaborator } from '../types';
import { projectApi } from '../api/projectApi';
import { fileApi } from '../api/fileApi';

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
  collaborators: Collaborator[];

  fetchProjects: () => Promise<void>;
  selectProject: (project: Project) => Promise<void>;
  refreshTree: () => Promise<void>;

  openFile: (file: { id: string; name: string; path: string; language: string }) => Promise<void>;
  closeTab: (fileId: string) => void;
  setActiveTabId: (fileId: string) => Promise<void>;

  updateActiveContent: (content: string) => void;
  saveActiveFile: () => Promise<void>;
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
  collaborators: [
    { id: 'mock-1', username: 'Rahul Sharma', color: '#4fc1ff' },
    { id: 'mock-2', username: 'Aman Verma', color: '#e5a93c' }
  ],

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

    set({ activeTabId: file.id });

    // Fetch active content
    try {
      const data = await fileApi.getFileContent(currentProject.id, file.id);
      set({
        activeFileContent: data.file.content,
        activeFileVersion: data.file.version
      });
    } catch (err) {
      console.error('[ProjectStore] Failed to fetch file content:', err);
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
