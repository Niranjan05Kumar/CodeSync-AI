import React from 'react';
import { TopBar } from './TopBar';
import { ActivityBar } from './ActivityBar';
import { StatusBar } from './StatusBar';
import { ResizableHandle } from './ResizableHandle';
import { ExplorerSidebar } from '../sidebar/ExplorerSidebar';
import { EditorArea } from '../editor/EditorArea';
import { BottomDock } from '../dock/BottomDock';
import { AIAssistantSidebar } from '../ai/AIAssistantSidebar';
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
    activeActivityTab, 
    sidebarWidth, 
    setSidebarWidth,
    isBottomPanelOpen,
    bottomPanelHeight,
    setBottomPanelHeight,
    isAiPanelOpen,
    aiPanelWidth,
    setAiPanelWidth
  } = useUIStore();

  return (
    <div className="h-screen w-screen flex flex-col bg-ide-bg text-ide-text overflow-hidden font-sans select-none">
      {/* 1. Top Window Bar (40px) */}
      <TopBar />

      {/* 2. Middle IDE Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Leftmost Activity Bar (48px) */}
        <ActivityBar />

        {/* Primary Sidebar (Resizable, default 256px) */}
        {isSidebarOpen && (
          <>
            <div
              style={{ width: `${sidebarWidth}px` }}
              className="h-full shrink-0 flex flex-col overflow-hidden bg-ide-sidebar z-10"
            >
              {activeActivityTab === 'explorer' && <ExplorerSidebar />}
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

            {/* Sidebar Resizable Divider */}
            <ResizableHandle
              direction="horizontal"
              onResize={(delta) => setSidebarWidth(sidebarWidth + delta)}
            />
          </>
        )}

        {/* Center Editor + Bottom Dock Column */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Main Editor Canvas */}
          <EditorArea />

          {/* Bottom Dock Resizable Handle */}
          {isBottomPanelOpen && (
            <ResizableHandle
              direction="vertical"
              onResize={(delta) => setBottomPanelHeight(bottomPanelHeight - delta)}
            />
          )}

          {/* Bottom Dock (Terminal / Output / Chat) */}
          <BottomDock />
        </div>

        {/* AI Assistant Side Panel (Optional Right Sidebar) */}
        {isAiPanelOpen && (
          <>
            <ResizableHandle
              direction="horizontal"
              onResize={(delta) => setAiPanelWidth(aiPanelWidth - delta)}
            />
            <AIAssistantSidebar />
          </>
        )}
      </div>

      {/* 3. Bottom Status Bar (24px) */}
      <StatusBar />

      {/* 4. Global Modals & Notifications */}
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
