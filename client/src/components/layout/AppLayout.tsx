import React, { useEffect } from 'react';
import { TopBar } from './TopBar';
import { ActivityBar } from './ActivityBar';
import { StatusBar } from './StatusBar';
import { ResizableHandle } from './ResizableHandle';
import { ExplorerSidebar } from '../sidebar/ExplorerSidebar';
import { CollaboratorsSidebar } from '../sidebar/CollaboratorsSidebar';
import { EditorArea } from '../editor/EditorArea';
import { BottomDock } from '../dock/BottomDock';
import { AIAssistantSidebar } from '../ai/AIAssistantSidebar';
import { MobileNavDrawer } from './MobileNavDrawer';
import { QuickOpenModal } from '../modals/QuickOpenModal';
import { CreateProjectModal } from '../modals/CreateProjectModal';
import { JoinRoomModal } from '../modals/JoinRoomModal';
import { InviteModal } from '../modals/InviteModal';
import { ConfirmModal } from '../modals/ConfirmModal';
import { AuthModal } from '../auth/AuthModal';
import { NotificationToast } from './NotificationToast';
import { useUIStore } from '../../store/useUIStore';

export const AppLayout: React.FC = () => {
  const { 
    isSidebarOpen, 
    setSidebarOpen,
    activeActivityTab, 
    sidebarWidth, 
    setSidebarWidth,
    isBottomPanelOpen,
    bottomPanelHeight,
    setBottomPanelHeight,
    isAiPanelOpen,
    setAiPanelOpen,
    aiPanelWidth,
    setAiPanelWidth
  } = useUIStore();

  // On screen resize across breakpoints, enforce tablet exclusivity rule
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined' && window.innerWidth < 1200) {
        if (isSidebarOpen && isAiPanelOpen) {
          setAiPanelOpen(false);
        }
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen, isAiPanelOpen, setAiPanelOpen]);

  // Reusable Sidebar content block
  const renderSidebarContent = () => (
    <div className="h-full w-full flex flex-col overflow-hidden bg-ide-sidebar select-none">
      {activeActivityTab === 'explorer' && <ExplorerSidebar />}
      {activeActivityTab === 'collaborators' && <CollaboratorsSidebar />}
      {activeActivityTab === 'search' && (
        <div className="h-full flex flex-col p-4 text-ide-dim text-ide-sm">
          <span className="font-semibold text-white uppercase text-ide-xs tracking-wider mb-2">
            Search
          </span>
          <input
            type="text"
            placeholder="Search in project..."
            className="w-full px-2.5 py-1.5 bg-[#1a1a1a] border border-ide-border rounded text-white text-ide-sm outline-none focus:border-ide-blue"
          />
          <div className="mt-4 text-center text-ide-dim text-ide-xs">
            Global search across files
          </div>
        </div>
      )}
      {activeActivityTab === 'settings' && (
        <div className="h-full flex flex-col p-4 text-ide-dim text-ide-sm">
          <span className="font-semibold text-white uppercase text-ide-xs tracking-wider mb-2">
            Settings
          </span>
          <div className="space-y-2 text-ide-xs">
            <div className="p-2 bg-[#252526] rounded border border-ide-border">
              <div className="font-medium text-white">Font Family</div>
              <div className="text-ide-dim">JetBrains Mono, Menlo</div>
            </div>
            <div className="p-2 bg-[#252526] rounded border border-ide-border">
              <div className="font-medium text-white">Theme</div>
              <div className="text-ide-dim">VS Code Dark Modern</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-ide-bg text-ide-text overflow-hidden font-sans select-none">
      {/* 1. Top Window Bar (40px) */}
      <TopBar />

      {/* 2. Middle IDE Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Leftmost Activity Bar (48px on Tablet & Desktop, hidden on Mobile) */}
        <ActivityBar />

        {/* Desktop Permanent In-Flow Sidebar (>= 1200px) */}
        {isSidebarOpen && (
          <div className="hidden xl:flex h-full shrink-0">
            <div
              style={{ width: `${sidebarWidth}px` }}
              className="h-full flex flex-col overflow-hidden bg-ide-sidebar z-10"
            >
              {renderSidebarContent()}
            </div>
            {/* Sidebar Resizable Divider */}
            <ResizableHandle
              direction="horizontal"
              onResize={(delta) => setSidebarWidth(sidebarWidth + delta)}
            />
          </div>
        )}

        {/* Mobile & Tablet Slide-Over Overlay Sidebar Drawer (< 1200px) */}
        {isSidebarOpen && (
          <div className="xl:hidden fixed inset-0 z-40 flex">
            {/* Clickable Backdrop to Dismiss */}
            <div 
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
            />
            {/* Slide-over Drawer Panel */}
            <div className="relative z-10 h-full w-[85vw] max-w-xs md:w-80 md:max-w-sm bg-ide-sidebar border-r border-ide-border shadow-2xl flex flex-col md:ml-12">
              {renderSidebarContent()}
            </div>
          </div>
        )}

        {/* Center Editor + Bottom Dock Column (Primary Persistent Workspace) */}
        <div className="flex-1 flex flex-col overflow-hidden relative min-w-0">
          {/* Main Monaco Editor Canvas */}
          <EditorArea />

          {/* Bottom Dock Resizable Handle (Desktop only) */}
          {isBottomPanelOpen && (
            <div className="hidden xl:block">
              <ResizableHandle
                direction="vertical"
                onResize={(delta) => setBottomPanelHeight(bottomPanelHeight - delta)}
              />
            </div>
          )}

          {/* Bottom Dock (Terminal / Output / Chat) */}
          <BottomDock />
        </div>

        {/* Desktop Permanent In-Flow AI Assistant Panel (>= 1200px) */}
        {isAiPanelOpen && (
          <div className="hidden xl:flex h-full shrink-0">
            <ResizableHandle
              direction="horizontal"
              onResize={(delta) => setAiPanelWidth(aiPanelWidth - delta)}
            />
            <AIAssistantSidebar />
          </div>
        )}

        {/* Mobile & Tablet Slide-Over Overlay AI Drawer (< 1200px) */}
        {isAiPanelOpen && (
          <div className="xl:hidden fixed inset-0 z-40 flex justify-end">
            {/* Clickable Backdrop to Dismiss */}
            <div 
              onClick={() => setAiPanelOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
            />
            {/* Slide-over AI Drawer Panel */}
            <div className="relative z-10 h-full w-full max-w-full sm:w-[90vw] sm:max-w-md md:w-96 bg-ide-sidebar border-l border-ide-border shadow-2xl flex flex-col">
              <AIAssistantSidebar />
            </div>
          </div>
        )}
      </div>

      {/* 3. Bottom Status Bar (24px) */}
      <StatusBar />

      {/* 4. Global Modals, Mobile Nav Menu & Notifications */}
      <MobileNavDrawer />
      <QuickOpenModal />
      <CreateProjectModal />
      <JoinRoomModal />
      <InviteModal />
      <ConfirmModal />
      <AuthModal />
      <NotificationToast />
    </div>
  );
};
