import { create } from 'zustand';

export interface UIState {
  // Panel Visibility
  isSidebarOpen: boolean;
  isAiPanelOpen: boolean;
  isBottomPanelOpen: boolean;

  // Panel Dimensions (in pixels)
  sidebarWidth: number;       // Default: 256, Min: 180, Max: 450
  aiPanelWidth: number;       // Default: 320, Min: 260, Max: 480
  bottomPanelHeight: number;  // Default: 224, Min: 120, Max: 600

  // Active Selections
  activeActivityTab: 'explorer' | 'search' | 'ai' | 'settings';
  activeBottomTab: 'output' | 'terminal' | 'problems' | 'chat';

  // Modals
  isQuickOpenOpen: boolean;
  isCreateProjectOpen: boolean;
  isAuthModalOpen: boolean;

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleAiPanel: () => void;
  setAiPanelOpen: (open: boolean) => void;
  toggleBottomPanel: () => void;
  setBottomPanelOpen: (open: boolean) => void;

  setSidebarWidth: (width: number) => void;
  setAiPanelWidth: (width: number) => void;
  setBottomPanelHeight: (height: number) => void;

  setActiveActivityTab: (tab: 'explorer' | 'search' | 'ai' | 'settings') => void;
  setActiveBottomTab: (tab: 'output' | 'terminal' | 'problems' | 'chat') => void;

  setQuickOpenOpen: (open: boolean) => void;
  setCreateProjectOpen: (open: boolean) => void;
  setAuthModalOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: true,
  isAiPanelOpen: false,
  isBottomPanelOpen: true,

  sidebarWidth: 256,
  aiPanelWidth: 320,
  bottomPanelHeight: 224,

  activeActivityTab: 'explorer',
  activeBottomTab: 'output',

  isQuickOpenOpen: false,
  isCreateProjectOpen: false,
  isAuthModalOpen: false,

  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),

  toggleAiPanel: () => set((s) => ({ isAiPanelOpen: !s.isAiPanelOpen })),
  setAiPanelOpen: (open) => set({ isAiPanelOpen: open }),

  toggleBottomPanel: () => set((s) => ({ isBottomPanelOpen: !s.isBottomPanelOpen })),
  setBottomPanelOpen: (open) => set({ isBottomPanelOpen: open }),

  setSidebarWidth: (width) => set({ sidebarWidth: Math.max(180, Math.min(450, width)) }),
  setAiPanelWidth: (width) => set({ aiPanelWidth: Math.max(260, Math.min(480, width)) }),
  setBottomPanelHeight: (height) => set({ bottomPanelHeight: Math.max(120, Math.min(600, height)) }),

  setActiveActivityTab: (tab) => set((s) => {
    // If clicking same tab, toggle sidebar
    if (s.activeActivityTab === tab && s.isSidebarOpen) {
      return { isSidebarOpen: false };
    }
    return { activeActivityTab: tab, isSidebarOpen: true };
  }),

  setActiveBottomTab: (tab) => set({ activeBottomTab: tab, isBottomPanelOpen: true }),

  setQuickOpenOpen: (open) => set({ isQuickOpenOpen: open }),
  setCreateProjectOpen: (open) => set({ isCreateProjectOpen: open }),
  setAuthModalOpen: (open) => set({ isAuthModalOpen: open })
}));
