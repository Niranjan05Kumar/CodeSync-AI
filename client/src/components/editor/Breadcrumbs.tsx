import React from 'react';
import { ChevronRight, FolderGit2 } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';

export const Breadcrumbs: React.FC = () => {
  const { currentProject, openTabs, activeTabId } = useProjectStore();
  const activeTab = openTabs.find((t) => t.id === activeTabId);

  if (!activeTab || !currentProject) return null;

  // Split path into segments e.g. "src/components/App.tsx" -> ["src", "components", "App.tsx"]
  const segments = activeTab.path.replace(/^\//, '').split('/');

  return (
    <div className="h-6 px-3 sm:px-4 bg-[#1e1e1e] border-b border-ide-border/40 flex items-center gap-1.5 text-ide-xs text-ide-muted select-none shrink-0 font-sans overflow-x-auto no-scrollbar whitespace-nowrap">
      <div className="flex items-center gap-1 hover:text-white cursor-pointer transition-colors">
        <FolderGit2 className="w-3 h-3 text-ide-blue" />
        <span className="font-medium">{currentProject.name}</span>
      </div>

      {segments.map((seg, idx) => {
        const isLast = idx === segments.length - 1;
        return (
          <React.Fragment key={idx}>
            <ChevronRight className="w-3 h-3 text-ide-dim shrink-0" />
            <span
              className={`truncate transition-colors ${
                isLast ? 'text-white font-medium flex items-center gap-1' : 'hover:text-white cursor-pointer'
              }`}
            >
              {seg}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
};
