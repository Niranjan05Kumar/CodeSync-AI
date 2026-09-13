import { Code2, Command, FileText, FolderPlus, Terminal } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { useUIStore } from '../../store/useUIStore';
import { EditorTabs } from './EditorTabs';
import { Breadcrumbs } from './Breadcrumbs';

export const EditorArea: React.FC = () => {
  const { openTabs, activeTabId, activeFileContent, updateActiveContent } = useProjectStore();
  const { setQuickOpenOpen, setCreateProjectOpen } = useUIStore();

  const activeTab = openTabs.find((t) => t.id === activeTabId);
  const lineCount = activeFileContent ? activeFileContent.split('\n').length : 1;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1f1f1f] overflow-hidden">
      {/* Tab Strip */}
      <EditorTabs />

      {/* Breadcrumb Trail */}
      <Breadcrumbs />

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab ? (
          /* Active File Code View (Pre-Monaco Shell for Phase 3) */
          <div className="h-full flex font-mono text-ide-sm bg-[#1f1f1f] text-[#d4d4d4] overflow-hidden">
            {/* Line Numbers Gutter */}
            <div className="w-12 py-3 bg-[#1f1f1f] select-none text-right pr-3 text-[#858585] text-xs border-r border-[#2b2b2b] shrink-0 font-mono leading-6">
              {Array.from({ length: Math.max(1, lineCount) }).map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>

            {/* Code Content TextArea */}
            <div className="flex-1 h-full relative overflow-auto">
              <textarea
                value={activeFileContent}
                onChange={(e) => updateActiveContent(e.target.value)}
                spellCheck={false}
                className="w-full h-full p-3 bg-transparent text-[#d4d4d4] font-mono text-ide-sm leading-6 resize-none outline-none border-none whitespace-pre overflow-auto tab-4"
              />
            </div>
          </div>
        ) : (
          /* Empty / Welcome State */
          <div className="h-full flex flex-col items-center justify-center p-8 select-none bg-[#1f1f1f]">
            <div className="w-16 h-16 rounded-2xl bg-[#252526] border border-ide-border flex items-center justify-center text-ide-blue mb-4 shadow-xl">
              <Code2 className="w-8 h-8" />
            </div>

            <h1 className="text-xl font-semibold text-white mb-2">
              CodeSync AI
            </h1>
            <p className="text-ide-muted text-ide-sm mb-8 text-center max-w-md">
              Real-time collaborative cloud IDE powered by Monaco, sandboxed Docker execution, and project-aware AI.
            </p>

            {/* Shortcuts Grid */}
            <div className="w-full max-w-sm space-y-2 text-ide-sm">
              <div
                onClick={() => setQuickOpenOpen(true)}
                className="flex items-center justify-between p-2 rounded hover:bg-[#252526] cursor-pointer text-ide-text hover:text-white transition-colors border border-transparent hover:border-ide-border"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-ide-blue" />
                  <span>Go to File</span>
                </div>
                <kbd className="px-1.5 py-0.5 bg-[#2a2d2e] border border-ide-border rounded text-xs text-ide-dim">
                  Ctrl + P
                </kbd>
              </div>

              <div
                onClick={() => setCreateProjectOpen(true)}
                className="flex items-center justify-between p-2 rounded hover:bg-[#252526] cursor-pointer text-ide-text hover:text-white transition-colors border border-transparent hover:border-ide-border"
              >
                <div className="flex items-center gap-2">
                  <FolderPlus className="w-4 h-4 text-ide-blue" />
                  <span>New Project</span>
                </div>
                <span className="text-xs text-ide-dim">Create</span>
              </div>

              <div className="flex items-center justify-between p-2 text-ide-text">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-ide-dim" />
                  <span className="text-ide-dim">Toggle Terminal</span>
                </div>
                <kbd className="px-1.5 py-0.5 bg-[#2a2d2e] border border-ide-border rounded text-xs text-ide-dim">
                  Ctrl + J
                </kbd>
              </div>

              <div className="flex items-center justify-between p-2 text-ide-text">
                <div className="flex items-center gap-2">
                  <Command className="w-4 h-4 text-ide-dim" />
                  <span className="text-ide-dim">Toggle Primary Sidebar</span>
                </div>
                <kbd className="px-1.5 py-0.5 bg-[#2a2d2e] border border-ide-border rounded text-xs text-ide-dim">
                  Ctrl + B
                </kbd>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
