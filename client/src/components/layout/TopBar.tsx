import React, { useEffect } from 'react';
import { 
  Code2, 
  Play, 
  Search, 
  Sparkles, 
  ChevronDown, 
  Plus, 
  User as UserIcon,
  LogOut,
  Loader2,
  Trash2
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useAuthStore } from '../../store/useAuthStore';

export const TopBar: React.FC = () => {
  const { 
    setQuickOpenOpen, 
    setCreateProjectOpen, 
    setAuthModalOpen,
    isAiPanelOpen,
    toggleAiPanel,
    showConfirm,
    showToast
  } = useUIStore();

  const { 
    currentProject, 
    projects, 
    selectProject, 
    deleteProject,
    collaborators,
    runActiveFile,
    isExecuting,
    activeTabId
  } = useProjectStore();
  const { user, isAuthenticated, logout } = useAuthStore();

  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = React.useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runActiveFile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [runActiveFile]);

  const handleDeleteProject = async (proj: { id: string; name: string }) => {
    const confirmed = await showConfirm({
      title: 'Delete Project',
      message: `Are you sure you want to permanently delete '${proj.name}'?\n\nAll files, folders, and history in this project will be deleted. This action cannot be undone.`,
      confirmText: 'Delete Project',
      cancelText: 'Cancel',
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      await deleteProject(proj.id);
      showToast(`Project '${proj.name}' was deleted.`, 'info');
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  };

  return (
    <header className="h-10 bg-ide-sidebar border-b border-ide-border px-3 flex items-center justify-between text-ide-base select-none z-30">
      {/* Left Section: Branding, Project Picker & Quick Search */}
      <div className="flex items-center gap-3">
        {/* Brand */}
        <div className="flex items-center gap-1.5 font-semibold text-white tracking-wide">
          <Code2 className="w-5 h-5 text-ide-blue" />
          <span className="hidden md:inline">CodeSync</span>
        </div>

        {/* Project Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
            className="h-7 px-2 bg-ide-elevated hover:bg-[#2d2d2d] text-white border border-ide-border rounded flex items-center gap-1.5 transition-colors max-w-[200px]"
          >
            <span className="truncate text-ide-sm font-medium">
              {currentProject ? currentProject.name : 'Select Project'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-ide-muted shrink-0" />
          </button>

          {isProjectDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-ide-elevated border border-ide-border shadow-2xl rounded py-1 z-50">
              <div className="px-3 py-1 text-ide-xs font-semibold text-ide-muted uppercase tracking-wider border-b border-ide-border flex justify-between items-center">
                <span>Your Projects</span>
                <button
                  onClick={() => {
                    setIsProjectDropdownOpen(false);
                    setCreateProjectOpen(true);
                  }}
                  className="p-1 hover:text-white hover:bg-ide-activity rounded"
                  title="Create New Project"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="max-h-56 overflow-y-auto py-1">
                {projects.map((proj) => (
                  <div
                    key={proj.id}
                    onClick={() => {
                      selectProject(proj);
                      setIsProjectDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left text-ide-sm flex items-center justify-between hover:bg-[#2a2d2e] cursor-pointer group/proj transition-colors ${
                      currentProject?.id === proj.id ? 'bg-[#04395e] text-white' : 'text-ide-text'
                    }`}
                  >
                    <span className="truncate flex-1 mr-2">{proj.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-ide-xs text-ide-muted">
                        {proj.role || 'editor'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(proj);
                        }}
                        className="opacity-0 group-hover/proj:opacity-100 p-1 text-ide-muted hover:text-red-400 hover:bg-[#383838] rounded transition-all ml-1"
                        title={`Delete project '${proj.name}'`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {projects.length === 0 && (
                  <div className="px-3 py-2 text-ide-xs text-ide-muted text-center">
                    No projects found
                  </div>
                )}
              </div>

              <div className="border-t border-ide-border p-1">
                <button
                  onClick={() => {
                    setIsProjectDropdownOpen(false);
                    setCreateProjectOpen(true);
                  }}
                  className="w-full h-6 px-2 text-ide-xs text-ide-blue hover:bg-[#2a2d2e] rounded flex items-center gap-1 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Project</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Open Search Button */}
        <button
          onClick={() => setQuickOpenOpen(true)}
          className="hidden sm:flex items-center gap-2 h-7 px-2.5 bg-ide-activity hover:border-ide-focus border border-ide-border rounded text-ide-muted hover:text-ide-text transition-colors w-48 md:w-60"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="text-ide-xs truncate">Search files (Ctrl + P)</span>
        </button>
      </div>

      {/* Center Section: Primary Run CTA */}
      <div className="flex items-center">
        <button
          onClick={() => runActiveFile()}
          disabled={isExecuting || !activeTabId}
          className={`h-7 px-3 text-white font-medium flex items-center gap-1.5 rounded transition-all text-ide-sm shadow-sm ${
            isExecuting
              ? 'bg-ide-blue/60 cursor-not-allowed opacity-80'
              : !activeTabId
              ? 'bg-[#333333] text-ide-muted cursor-not-allowed'
              : 'bg-ide-blue hover:bg-ide-blueHover cursor-pointer'
          }`}
          title={activeTabId ? 'Run Active File (Ctrl + Enter)' : 'Open a file to run'}
        >
          {isExecuting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
          <span>{isExecuting ? 'Running...' : 'Run'}</span>
        </button>
      </div>

      {/* Right Section: Collaborator Presence, AI Toggle & Auth Profile */}
      <div className="flex items-center gap-3">
        {/* Collaborators Avatar Stack */}
        <div className="flex items-center -space-x-1.5">
          {collaborators.map((c) => (
            <div
              key={c.id}
              className="w-6 h-6 rounded-full flex items-center justify-center text-ide-xs font-bold text-white border border-ide-sidebar cursor-pointer"
              style={{ backgroundColor: c.color }}
              title={`${c.username} (Online)`}
            >
              {c.username.slice(0, 1).toUpperCase()}
            </div>
          ))}
        </div>

        {/* AI Assistant Toggle Button */}
        <button
          onClick={toggleAiPanel}
          className={`h-7 px-2.5 rounded border flex items-center gap-1.5 transition-colors text-ide-sm ${
            isAiPanelOpen
              ? 'bg-ide-blue text-white border-ide-blue'
              : 'bg-ide-elevated hover:bg-[#2d2d2d] text-ide-text border-ide-border'
          }`}
          title="Toggle AI Assistant (Ctrl + Shift + A)"
        >
          <Sparkles className="w-3.5 h-3.5 text-ide-amber" />
          <span className="hidden lg:inline">AI Assistant</span>
        </button>

        {/* User Profile / Auth State */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2 pl-2 border-l border-ide-border">
            <div className="flex items-center gap-1.5 text-ide-sm text-ide-text">
              <div className="w-6 h-6 rounded-full bg-ide-blue flex items-center justify-center text-ide-xs font-bold text-white">
                {user.username.slice(0, 1).toUpperCase()}
              </div>
              <span className="hidden xl:inline max-w-[100px] truncate">{user.username}</span>
            </div>
            <button
              onClick={logout}
              className="p-1 hover:text-ide-red text-ide-muted transition-colors rounded"
              title="Log Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAuthModalOpen(true)}
            className="h-7 px-3 bg-ide-elevated hover:bg-[#2d2d2d] text-white border border-ide-border rounded flex items-center gap-1 text-ide-sm transition-colors"
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
