import React from 'react';
import { 
  GitBranch, 
  CheckCircle2, 
  Wifi, 
  Users 
} from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { useUIStore } from '../../store/useUIStore';
import { getLanguageDisplayName } from '../editor/monacoConfig';

export const StatusBar: React.FC = () => {
  const { openTabs, activeTabId, collaborators } = useProjectStore();
  const { cursorPosition } = useUIStore();

  const activeTab = openTabs.find((t) => t.id === activeTabId);
  const language = activeTab ? getLanguageDisplayName(activeTab.language) : 'Plain Text';

  return (
    <footer className="h-6 bg-ide-activity border-t border-ide-border px-3 flex items-center justify-between text-ide-xs text-ide-muted select-none z-30 font-mono">
      {/* Left Section: Git & RAG status */}
      <div className="flex items-center gap-2.5">
        {/* Git Branch */}
        <div className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors">
          <GitBranch className="w-3.5 h-3.5 text-ide-blue" />
          <span>main*</span>
        </div>

        {/* RAG Status (Tablet & Desktop) */}
        <div className="hidden md:flex items-center gap-1 text-ide-muted hover:text-white cursor-pointer transition-colors">
          <CheckCircle2 className="w-3 h-3 text-ide-green" />
          <span className="hidden xl:inline">RAG Indexed</span>
        </div>
      </div>

      {/* Right Section: Editor Metrics & Connectivity */}
      <div className="flex items-center gap-2.5">
        {/* Line & Column */}
        <span className="hidden xs:inline hover:text-white cursor-pointer">
          Ln {cursorPosition.lineNumber}, Col {cursorPosition.column}
        </span>

        {/* Indentation (Desktop only) */}
        <span className="hidden xl:inline hover:text-white cursor-pointer">Spaces: 2</span>

        {/* Encoding (Desktop only) */}
        <span className="hidden xl:inline hover:text-white cursor-pointer">UTF-8</span>

        {/* Active Language Mode */}
        <span className="hover:text-white cursor-pointer font-sans text-ide-text">
          {language}
        </span>

        {/* Online Presence */}
        <div className="hidden sm:flex items-center gap-1 text-ide-text">
          <Users className="w-3.5 h-3.5 text-ide-blue" />
          <span>{collaborators.length + 1}</span>
        </div>

        {/* Real-time Connection Status */}
        <div className="flex items-center gap-1 text-ide-green font-sans" title="Connected to WebSocket Server">
          <Wifi className="w-3 h-3" />
          <span className="hidden sm:inline">Connected</span>
        </div>
      </div>
    </footer>
  );
};
