import { create } from 'zustand';

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  resolve?: (value: boolean) => void;
}

export interface ToastItem {
  id: string;
  message: string;
  type: 'error' | 'warning' | 'info' | 'success';
  timestamp: number;
}

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
  activeActivityTab: 'explorer' | 'search' | 'ai' | 'settings' | 'collaborators';
  activeBottomTab: 'output' | 'terminal' | 'chat';
  cursorPosition: { lineNumber: number; column: number };

  // Modals
  isQuickOpenOpen: boolean;
  isCreateProjectOpen: boolean;
  isAuthModalOpen: boolean;
  isJoinRoomOpen: boolean;
  isInviteModalOpen: boolean;
  isMobileMenuOpen: boolean;

  // Custom Confirmation Dialog & Toasts
  confirmDialog: ConfirmDialogOptions | null;
  toasts: ToastItem[];

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleAiPanel: () => void;
  setAiPanelOpen: (open: boolean) => void;
  toggleBottomPanel: () => void;
  setBottomPanelOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  closeAllDrawers: () => void;

  setSidebarWidth: (width: number) => void;
  setAiPanelWidth: (width: number) => void;
  setBottomPanelHeight: (height: number) => void;

  setActiveActivityTab: (tab: 'explorer' | 'search' | 'ai' | 'settings' | 'collaborators') => void;
  setActiveBottomTab: (tab: 'output' | 'terminal' | 'chat') => void;
  setCursorPosition: (pos: { lineNumber: number; column: number }) => void;

  setQuickOpenOpen: (open: boolean) => void;
  setCreateProjectOpen: (open: boolean) => void;
  setAuthModalOpen: (open: boolean) => void;
  setJoinRoomOpen: (open: boolean) => void;
  setInviteModalOpen: (open: boolean) => void;

  showConfirm: (options: Omit<ConfirmDialogOptions, 'resolve'>) => Promise<boolean>;
  closeConfirm: (result: boolean) => void;

  showToast: (message: string, type?: 'error' | 'warning' | 'info' | 'success') => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  isSidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 1200 : true,
  isAiPanelOpen: false,
  isBottomPanelOpen: true,
  isMobileMenuOpen: false,

  sidebarWidth: 256,
  aiPanelWidth: 320,
  bottomPanelHeight: 224,

  activeActivityTab: 'explorer',
  activeBottomTab: 'output',
  cursorPosition: { lineNumber: 1, column: 1 },

  isQuickOpenOpen: false,
  isCreateProjectOpen: false,
  isAuthModalOpen: false,
  isJoinRoomOpen: false,
  isInviteModalOpen: false,

  confirmDialog: null,
  toasts: [],

  toggleSidebar: () => set((s) => {
    const next = !s.isSidebarOpen;
    const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 1200;
    return { 
      isSidebarOpen: next,
      // On tablet/mobile, opening sidebar closes AI panel and mobile menu
      ...(next && isSmallScreen ? { isAiPanelOpen: false, isMobileMenuOpen: false } : {})
    };
  }),
  setSidebarOpen: (open) => set((s) => {
    const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 1200;
    return {
      isSidebarOpen: open,
      ...(open && isSmallScreen ? { isAiPanelOpen: false, isMobileMenuOpen: false } : {})
    };
  }),

  toggleAiPanel: () => set((s) => {
    const next = !s.isAiPanelOpen;
    const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 1200;
    return { 
      isAiPanelOpen: next,
      // On tablet/mobile, opening AI panel closes sidebar drawer
      ...(next && isSmallScreen ? { isSidebarOpen: false, isMobileMenuOpen: false } : {})
    };
  }),
  setAiPanelOpen: (open) => set((s) => {
    const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 1200;
    return {
      isAiPanelOpen: open,
      ...(open && isSmallScreen ? { isSidebarOpen: false, isMobileMenuOpen: false } : {})
    };
  }),

  toggleBottomPanel: () => set((s) => ({ isBottomPanelOpen: !s.isBottomPanelOpen })),
  setBottomPanelOpen: (open) => set({ isBottomPanelOpen: open }),

  toggleMobileMenu: () => set((s) => ({ isMobileMenuOpen: !s.isMobileMenuOpen })),
  setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),

  closeAllDrawers: () => set({ isSidebarOpen: false, isAiPanelOpen: false, isMobileMenuOpen: false }),

  setSidebarWidth: (width) => set({ sidebarWidth: Math.max(180, Math.min(450, width)) }),
  setAiPanelWidth: (width) => set({ aiPanelWidth: Math.max(260, Math.min(480, width)) }),
  setBottomPanelHeight: (height) => set({ bottomPanelHeight: Math.max(120, Math.min(600, height)) }),

  setActiveActivityTab: (tab) => set((s) => {
    const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 1200;
    // If clicking same tab and sidebar is open, toggle off
    if (s.activeActivityTab === tab && s.isSidebarOpen) {
      return { isSidebarOpen: false };
    }
    return { 
      activeActivityTab: tab, 
      isSidebarOpen: true,
      ...(isSmallScreen ? { isAiPanelOpen: false, isMobileMenuOpen: false } : {})
    };
  }),

  setActiveBottomTab: (tab) => set({ activeBottomTab: tab, isBottomPanelOpen: true }),
  setCursorPosition: (pos) => set({ cursorPosition: pos }),

  setQuickOpenOpen: (open) => set({ isQuickOpenOpen: open }),
  setCreateProjectOpen: (open) => set({ isCreateProjectOpen: open }),
  setAuthModalOpen: (open) => set({ isAuthModalOpen: open }),
  setJoinRoomOpen: (open) => set({ isJoinRoomOpen: open }),
  setInviteModalOpen: (open) => set({ isInviteModalOpen: open }),

  showConfirm: (options) => {
    return new Promise<boolean>((resolve) => {
      set({
        confirmDialog: {
          ...options,
          resolve
        }
      });
    });
  },

  closeConfirm: (result) => {
    const dialog = get().confirmDialog;
    if (dialog?.resolve) {
      dialog.resolve(result);
    }
    set({ confirmDialog: null });
  },

  showToast: (message, type = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({
      toasts: [...s.toasts, { id, message, type, timestamp: Date.now() }]
    }));
    setTimeout(() => {
      get().removeToast(id);
    }, 4500);
  },

  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  }
}));
