import React, { useEffect } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { useAuthStore } from './store/useAuthStore';
import { useProjectStore } from './store/useProjectStore';
import { useUIStore } from './store/useUIStore';
import { useSocketSync } from './hooks/useSocketSync';

export const App: React.FC = () => {
  const { initAuth } = useAuthStore();
  const { fetchProjects, saveActiveFile } = useProjectStore();
  const { 
    setQuickOpenOpen, 
    toggleSidebar, 
    toggleBottomPanel, 
    toggleAiPanel 
  } = useUIStore();

  // Initialize real-time room synchronization
  useSocketSync();

  useEffect(() => {
    // 1. Initialize authentication from localStorage
    initAuth();

    // 2. Detect ?room= query parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');

    if (roomParam) {
      const cleanRoom = roomParam.trim().toUpperCase();
      // Clean query string from browser URL bar without page reload
      window.history.replaceState({}, document.title, window.location.pathname);

      const hasAuthToken = localStorage.getItem('codesync_access_token');
      if (hasAuthToken) {
        // Authenticated user: automatically join room
        useProjectStore.getState().joinRoom(cleanRoom).then((p) => {
          useUIStore.getState().showToast(`Joined room "${p.name}" (${p.roomCode || cleanRoom})`, 'success');
        }).catch((err) => {
          useUIStore.getState().showToast(err.message || 'Failed to join room', 'error');
          fetchProjects();
        });
      } else {
        // Unauthenticated user: store pending room and prompt sign in
        sessionStorage.setItem('pending_join_room', cleanRoom);
        useUIStore.getState().setAuthModalOpen(true);
        useUIStore.getState().showToast(`Please sign in or register to join room ${cleanRoom}`, 'info');
      }
    } else {
      // 3. Normal startup: Fetch existing user projects
      fetchProjects();
    }

    // 3. Global keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (!isCmdOrCtrl) return;

      // Ctrl + P: Quick Open
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        setQuickOpenOpen(true);
      }

      // Ctrl + B: Toggle Sidebar
      else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        toggleSidebar();
      }

      // Ctrl + J: Toggle Bottom Dock (Terminal/Output)
      else if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        toggleBottomPanel();
      }

      // Ctrl + S: Save File
      else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        saveActiveFile();
      }

      // Ctrl + Shift + A: AI Assistant
      else if (e.shiftKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        toggleAiPanel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [initAuth, fetchProjects, saveActiveFile, setQuickOpenOpen, toggleSidebar, toggleBottomPanel, toggleAiPanel]);

  return <AppLayout />;
};

export default App;
