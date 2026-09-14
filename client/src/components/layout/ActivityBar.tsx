import React from 'react';
import { 
  Files, 
  Search, 
  Sparkles, 
  Settings, 
  Users 
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useProjectStore } from '../../store/useProjectStore';

export const ActivityBar: React.FC = () => {
  const { 
    activeActivityTab, 
    setActiveActivityTab, 
    isSidebarOpen, 
    toggleAiPanel,
    isAiPanelOpen 
  } = useUIStore();

  const { collaborators } = useProjectStore();

  return (
    <aside className="hidden md:flex w-12 bg-ide-activity border-r border-ide-border flex-col justify-between items-center py-2 select-none z-20 shrink-0">
      {/* Top Stack */}
      <div className="flex flex-col items-center gap-1 w-full">
        {/* Explorer */}
        <button
          onClick={() => setActiveActivityTab('explorer')}
          className={`relative w-full h-11 flex items-center justify-center transition-colors ${
            activeActivityTab === 'explorer' && isSidebarOpen
              ? 'text-white'
              : 'text-ide-dim hover:text-ide-text'
          }`}
          title="Explorer (Ctrl + Shift + E)"
        >
          {activeActivityTab === 'explorer' && isSidebarOpen && (
            <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-ide-blue" />
          )}
          <Files className="w-5 h-5" />
        </button>

        {/* Search */}
        <button
          onClick={() => setActiveActivityTab('search')}
          className={`relative w-full h-11 flex items-center justify-center transition-colors ${
            activeActivityTab === 'search' && isSidebarOpen
              ? 'text-white'
              : 'text-ide-dim hover:text-ide-text'
          }`}
          title="Search (Ctrl + Shift + F)"
        >
          {activeActivityTab === 'search' && isSidebarOpen && (
            <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-ide-blue" />
          )}
          <Search className="w-5 h-5" />
        </button>

        {/* AI Assistant */}
        <button
          onClick={toggleAiPanel}
          className={`relative w-full h-11 flex items-center justify-center transition-colors ${
            isAiPanelOpen
              ? 'text-ide-amber'
              : 'text-ide-dim hover:text-ide-text'
          }`}
          title="AI Assistant (Ctrl + Shift + A)"
        >
          {isAiPanelOpen && (
            <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-ide-amber" />
          )}
          <Sparkles className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom Stack */}
      <div className="flex flex-col items-center gap-1 w-full">
        {/* Collaborators */}
        <button
          onClick={() => setActiveActivityTab('collaborators')}
          className={`relative w-full h-10 flex items-center justify-center transition-colors ${
            activeActivityTab === 'collaborators' && isSidebarOpen
              ? 'text-white'
              : 'text-ide-dim hover:text-ide-text'
          }`}
          title={`${collaborators.length} Collaborator(s) Online (Click to view list)`}
        >
          {activeActivityTab === 'collaborators' && isSidebarOpen && (
            <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-ide-blue" />
          )}
          <Users className="w-5 h-5" />
          <span className="absolute top-1 right-2 text-[9px] font-bold bg-ide-blue text-white rounded-full w-3.5 h-3.5 flex items-center justify-center">
            {collaborators.length}
          </span>
        </button>

        {/* Settings */}
        <button
          onClick={() => setActiveActivityTab('settings')}
          className={`relative w-full h-10 flex items-center justify-center transition-colors ${
            activeActivityTab === 'settings' && isSidebarOpen
              ? 'text-white'
              : 'text-ide-dim hover:text-ide-text'
          }`}
          title="Settings"
        >
          {activeActivityTab === 'settings' && isSidebarOpen && (
            <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-ide-blue" />
          )}
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
};
