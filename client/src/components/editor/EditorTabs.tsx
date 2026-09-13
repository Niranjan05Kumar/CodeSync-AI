import React from 'react';
import { X, FileCode, FileText, FileJson, File } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';

export const EditorTabs: React.FC = () => {
  const { openTabs, activeTabId, setActiveTabId, closeTab, unsavedFileIds } = useProjectStore();

  if (openTabs.length === 0) return null;

  return (
    <div className="h-9 bg-[#181818] border-b border-ide-border flex items-center overflow-x-auto select-none shrink-0 no-scrollbar">
      {openTabs.map((tab) => {
        const isActive = activeTabId === tab.id;
        const isUnsaved = unsavedFileIds.includes(tab.id);

        return (
          <div
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            onAuxClick={(e) => {
              // Middle click to close tab
              if (e.button === 1) {
                e.preventDefault();
                closeTab(tab.id);
              }
            }}
            className={`h-full px-3 flex items-center gap-2 border-r border-ide-border cursor-pointer text-ide-sm group transition-colors min-w-[120px] max-w-[200px] shrink-0 relative ${
              isActive
                ? 'bg-[#1f1f1f] text-white border-t-2 border-t-ide-blue'
                : 'bg-[#181818] text-ide-dim hover:bg-[#1e1e1e] hover:text-ide-text border-t-2 border-t-transparent'
            }`}
          >
            {getFileIcon(tab.name)}
            <span className="truncate flex-1 font-medium">{tab.name}</span>

            {/* Unsaved indicator or close icon */}
            <div className="w-4 h-4 flex items-center justify-center shrink-0">
              {isUnsaved ? (
                <span
                  title="Unsaved changes"
                  className="w-2 h-2 rounded-full bg-white group-hover:hidden"
                />
              ) : null}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className={`p-0.5 rounded hover:bg-[#333333] text-ide-muted hover:text-white transition-colors ${
                  isUnsaved ? 'hidden group-hover:block' : 'opacity-0 group-hover:opacity-100'
                } ${isActive ? 'opacity-100' : ''}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'py':
      return <FileCode className="w-3.5 h-3.5 text-yellow-400 shrink-0" />;
    case 'ts':
    case 'tsx':
      return <FileCode className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
    case 'js':
    case 'jsx':
      return <FileCode className="w-3.5 h-3.5 text-amber-300 shrink-0" />;
    case 'json':
      return <FileJson className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    case 'md':
      return <FileText className="w-3.5 h-3.5 text-gray-300 shrink-0" />;
    default:
      return <File className="w-3.5 h-3.5 text-ide-muted shrink-0" />;
  }
}
