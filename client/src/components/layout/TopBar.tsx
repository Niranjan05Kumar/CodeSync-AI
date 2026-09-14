import React, { useEffect, useState, useRef } from 'react';
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
  Trash2,
  DoorOpen,
  Share2,
  Menu,
  MoreVertical,
  Users,
  Settings,
  Copy,
  Check
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useAuthStore } from '../../store/useAuthStore';

export const TopBar: React.FC = () => {
  const { 
    setQuickOpenOpen, 
    setCreateProjectOpen, 
    setAuthModalOpen,
    setJoinRoomOpen,
    setInviteModalOpen,
    isAiPanelOpen,
    toggleAiPanel,
    toggleMobileMenu,
    setActiveActivityTab,
    setSidebarOpen,
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

  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const [copiedRoomCode, setCopiedRoomCode] = useState(false);

  const overflowRef = useRef<HTMLDivElement>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setIsOverflowOpen(false);
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter')) {
        const target = e.target as HTMLElement | null;
        // Ignore if user is inside a standard single-line form input (e.g. rename, search modal)
        if (target && target.tagName === 'INPUT' && !target.classList.contains('inputarea')) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        runActiveFile();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
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

  const handleLogout = async () => {
    const confirmed = await showConfirm({
      title: 'Log Out',
      message: 'Are you sure you want to log out of CodeSync AI? Your current session and open project will be closed.',
      confirmText: 'Log Out',
      cancelText: 'Stay Logged In',
      type: 'danger'
    });

    if (confirmed) {
      logout();
      showToast('Logged out successfully', 'info');
    }
  };

  const handleOpenJoinRoom = () => {
    if (!isAuthenticated) {
      showToast('Please log in or create an account to join a room', 'warning');
      setAuthModalOpen(true);
      return;
    }
    setJoinRoomOpen(true);
  };

  const roomCode = currentProject
    ? (currentProject.roomCode || currentProject.room_code || currentProject.id.slice(0, 8).toUpperCase())
    : '';

  const handleCopyRoomCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopiedRoomCode(true);
    showToast(`Room ID "${roomCode}" copied to clipboard!`, 'info');
    setTimeout(() => setCopiedRoomCode(false), 2000);
  };

  return (
    <header className="h-10 bg-ide-sidebar border-b border-ide-border px-2 md:px-3 flex items-center justify-between text-ide-base select-none relative z-40 shrink-0 gap-1.5">
      {/* Left Section: Mobile Menu, Brand, Project Selector */}
      <div className="flex items-center gap-1.5 md:gap-2.5 min-w-0">
        {/* Mobile Hamburger Menu (Mobile only) */}
        <button
          onClick={toggleMobileMenu}
          className="md:hidden p-1.5 text-ide-muted hover:text-white rounded hover:bg-[#2a2d2e] transition-colors shrink-0"
          title="Open Navigation Menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Brand */}
        <div className="flex items-center gap-1.5 font-semibold text-white tracking-wide shrink-0">
          <Code2 className="w-5 h-5 text-ide-blue shrink-0" />
          <span className="hidden sm:inline font-bold">CodeSync</span>
        </div>

        {/* Project Selector Dropdown */}
        <div className="relative" ref={projectDropdownRef}>
          <button
            onClick={() => {
              setIsOverflowOpen(false);
              setIsProjectDropdownOpen(!isProjectDropdownOpen);
            }}
            className="h-7 px-2 bg-ide-elevated hover:bg-[#2d2d2d] text-white border border-ide-border rounded flex items-center gap-1 transition-colors max-w-[110px] xs:max-w-[140px] sm:max-w-[180px] md:max-w-[200px]"
            title={currentProject ? `Project: ${currentProject.name}` : 'Select Project'}
          >
            <span className="truncate text-ide-xs sm:text-ide-sm font-medium">
              {currentProject ? currentProject.name : 'Select Project'}
            </span>
            <ChevronDown className="w-3 h-3 text-ide-muted shrink-0" />
          </button>

          {isProjectDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-60 sm:w-64 bg-ide-elevated border border-ide-border shadow-2xl rounded py-1 z-50">
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

              <div className="border-t border-ide-border p-1 flex items-center gap-1">
                <button
                  onClick={() => {
                    setIsProjectDropdownOpen(false);
                    setCreateProjectOpen(true);
                  }}
                  className="flex-1 h-6 px-2 text-ide-xs text-ide-blue hover:bg-[#2a2d2e] rounded flex items-center justify-center gap-1 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New</span>
                </button>
                <button
                  onClick={() => {
                    setIsProjectDropdownOpen(false);
                    handleOpenJoinRoom();
                  }}
                  className="flex-1 h-6 px-2 text-ide-xs text-ide-text hover:text-white hover:bg-[#2a2d2e] rounded flex items-center justify-center gap-1 font-medium"
                >
                  <DoorOpen className="w-3.5 h-3.5 text-ide-blue" />
                  <span>Join Room</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Join Room Quick Button (Tablet & Desktop) */}
        <button
          onClick={handleOpenJoinRoom}
          className="hidden sm:flex h-7 px-2 bg-ide-elevated hover:bg-[#2d2d2d] text-white border border-ide-border rounded items-center gap-1 transition-colors text-ide-xs font-medium shrink-0"
          title="Join a room with an 8-character Room ID"
        >
          <DoorOpen className="w-3.5 h-3.5 text-ide-blue" />
          <span className="hidden md:inline">Join</span>
        </button>

        {/* Active 8-Character Room ID Badge (Desktop >= 1200px) */}
        {currentProject && (
          <button
            onClick={() => setInviteModalOpen(true)}
            className="hidden xl:flex items-center gap-1.5 h-7 px-2.5 bg-ide-activity border border-ide-border hover:border-ide-blue rounded text-ide-xs text-ide-muted hover:text-white transition-colors shrink-0"
            title="Click to copy 8-character Room ID or share with collaborators"
          >
            <span className="text-[10px] text-ide-muted uppercase font-semibold">Room:</span>
            <span className="font-mono text-white font-bold tracking-widest">{roomCode}</span>
          </button>
        )}

        {/* Quick Open Search - Compact on Tablet, Full on Desktop */}
        <button
          onClick={() => setQuickOpenOpen(true)}
          className="hidden md:flex xl:hidden h-7 w-7 items-center justify-center bg-ide-activity hover:border-ide-focus border border-ide-border rounded text-ide-muted hover:text-ide-text transition-colors shrink-0"
          title="Search files (Ctrl + P)"
        >
          <Search className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setQuickOpenOpen(true)}
          className="hidden xl:flex items-center gap-2 h-7 px-2.5 bg-ide-activity hover:border-ide-focus border border-ide-border rounded text-ide-muted hover:text-ide-text transition-colors w-40 desktop:w-48 shrink-0"
          title="Search files (Ctrl + P)"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="text-ide-xs truncate">Search files (Ctrl + P)</span>
        </button>
      </div>

      {/* Center Section: Primary Run CTA */}
      <div className="flex items-center shrink-0">
        <button
          onClick={() => runActiveFile()}
          disabled={isExecuting || !activeTabId}
          className={`h-7 px-2.5 sm:px-3 text-white font-medium flex items-center gap-1.5 rounded transition-all text-ide-xs sm:text-ide-sm shadow-sm ${
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
            <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />
          )}
          <span>{isExecuting ? 'Running...' : 'Run'}</span>
        </button>
      </div>

      {/* Right Section: Mobile Controls + Tablet/Desktop Extensions */}
      <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
        {/* Share / Invite Button (Tablet & Desktop) */}
        {currentProject && (
          <button
            onClick={() => setInviteModalOpen(true)}
            className="hidden md:flex h-7 px-2.5 bg-ide-blue/15 hover:bg-ide-blue/25 text-ide-blue border border-ide-blue/30 rounded items-center gap-1.5 text-ide-xs font-medium transition-colors shrink-0"
            title="Share Room Code & Invite Collaborators"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Share</span>
          </button>
        )}

        {/* Collaborators Avatar Stack (Desktop >= 1200px) */}
        <div 
          onClick={() => currentProject && setInviteModalOpen(true)}
          className="hidden xl:flex items-center -space-x-1.5 cursor-pointer shrink-0"
          title="Click to view room collaborators"
        >
          {collaborators.map((c) => (
            <div
              key={c.id}
              className="w-6 h-6 rounded-full flex items-center justify-center text-ide-xs font-bold text-white border border-ide-sidebar hover:scale-110 transition-transform"
              style={{ backgroundColor: c.color }}
              title={`${c.username} (Online)`}
            >
              {c.username.slice(0, 1).toUpperCase()}
            </div>
          ))}
        </div>

        {/* AI Assistant Button (Compact on mobile, full on desktop) */}
        <button
          onClick={toggleAiPanel}
          className={`h-7 px-2 sm:px-2.5 rounded border flex items-center gap-1 sm:gap-1.5 transition-colors text-ide-xs sm:text-ide-sm shrink-0 ${
            isAiPanelOpen
              ? 'bg-ide-blue text-white border-ide-blue'
              : 'bg-ide-elevated hover:bg-[#2d2d2d] text-ide-text border-ide-border'
          }`}
          title="Toggle AI Assistant (Ctrl + Shift + A)"
        >
          <Sparkles className="w-3.5 h-3.5 text-ide-amber shrink-0" />
          <span className="font-medium">AI</span>
          <span className="hidden xl:inline font-normal">Assistant</span>
        </button>

        {/* User Profile / Auth State (Tablet & Desktop) */}
        {isAuthenticated && user ? (
          <div className="hidden md:flex items-center gap-2 pl-2 border-l border-ide-border shrink-0">
            <div className="flex items-center gap-1.5 text-ide-sm text-ide-text">
              <div className="w-6 h-6 rounded-full bg-ide-blue flex items-center justify-center text-ide-xs font-bold text-white uppercase">
                {user.username.slice(0, 1)}
              </div>
              <span className="hidden xl:inline max-w-[90px] truncate">{user.username}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-1 hover:text-ide-red text-ide-muted transition-colors rounded"
              title="Log Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAuthModalOpen(true)}
            className="hidden md:flex h-7 px-2.5 bg-ide-elevated hover:bg-[#2d2d2d] text-white border border-ide-border rounded items-center gap-1 text-ide-xs sm:text-ide-sm transition-colors shrink-0"
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}

        {/* Mobile & Tablet Overflow Menu (⋯) */}
        <div className="relative md:hidden" ref={overflowRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsProjectDropdownOpen(false);
              setIsOverflowOpen(!isOverflowOpen);
            }}
            className={`h-7 w-7 flex items-center justify-center rounded border transition-colors ${
              isOverflowOpen 
                ? 'bg-ide-elevated text-white border-ide-blue' 
                : 'border-ide-border text-ide-muted hover:text-white hover:bg-ide-elevated'
            }`}
            title="More Actions"
            aria-label="More Actions"
            aria-expanded={isOverflowOpen}
          >
            <MoreVertical className="w-4 h-4 pointer-events-none" />
          </button>

          {isOverflowOpen && (
            <div className="absolute top-full right-0 mt-1 w-56 bg-ide-elevated border border-ide-border shadow-2xl rounded py-1 z-50 text-ide-sm">
              {currentProject && (
                <>
                  <div className="px-3 py-2 border-b border-ide-border bg-[#1b1b1c]">
                    <div className="text-[10px] text-ide-muted uppercase font-semibold">Room Code</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono text-xs font-bold text-white tracking-widest">{roomCode}</span>
                      <button
                        onClick={handleCopyRoomCode}
                        className="p-1 text-ide-dim hover:text-white rounded"
                        title="Copy Room Code"
                      >
                        {copiedRoomCode ? <Check className="w-3.5 h-3.5 text-ide-green" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setIsOverflowOpen(false);
                      setInviteModalOpen(true);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-[#2a2d2e] flex items-center gap-2.5 text-ide-text hover:text-white transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5 text-ide-blue" />
                    <span>Share & Invite</span>
                  </button>
                </>
              )}

              <button
                onClick={() => {
                  setIsOverflowOpen(false);
                  setQuickOpenOpen(true);
                }}
                className="w-full px-3 py-2 text-left hover:bg-[#2a2d2e] flex items-center gap-2.5 text-ide-text hover:text-white transition-colors"
              >
                <Search className="w-3.5 h-3.5 text-ide-blue" />
                <span>Search Files (Ctrl+P)</span>
              </button>

              <button
                onClick={() => {
                  setIsOverflowOpen(false);
                  setActiveActivityTab('collaborators');
                  setSidebarOpen(true);
                }}
                className="w-full px-3 py-2 text-left hover:bg-[#2a2d2e] flex items-center justify-between text-ide-text hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-3.5 h-3.5 text-ide-green" />
                  <span>Collaborators</span>
                </div>
                <span className="text-[10px] px-1.5 bg-ide-blue text-white rounded-full font-bold">
                  {collaborators.length + (user ? 1 : 0)}
                </span>
              </button>

              <button
                onClick={() => {
                  setIsOverflowOpen(false);
                  setActiveActivityTab('settings');
                  setSidebarOpen(true);
                }}
                className="w-full px-3 py-2 text-left hover:bg-[#2a2d2e] flex items-center gap-2.5 text-ide-text hover:text-white transition-colors"
              >
                <Settings className="w-3.5 h-3.5 text-ide-muted" />
                <span>Settings</span>
              </button>

              <div className="border-t border-ide-border my-1" />

              {isAuthenticated && user ? (
                <button
                  onClick={() => {
                    setIsOverflowOpen(false);
                    handleLogout();
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-[#2a2d2e] flex items-center gap-2.5 text-ide-red transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out ({user.username})</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsOverflowOpen(false);
                    setAuthModalOpen(true);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-[#2a2d2e] flex items-center gap-2.5 text-ide-blue transition-colors font-medium"
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Sign In / Register</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
