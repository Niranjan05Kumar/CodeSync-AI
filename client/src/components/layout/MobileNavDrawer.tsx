import React from 'react';
import { 
  X, 
  Files, 
  Search, 
  Sparkles, 
  Users, 
  Settings, 
  DoorOpen, 
  Plus, 
  LogOut, 
  User as UserIcon,
  FolderGit2,
  Share2,
  Code2
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useAuthStore } from '../../store/useAuthStore';

export const MobileNavDrawer: React.FC = () => {
  const { 
    isMobileMenuOpen, 
    setMobileMenuOpen, 
    setActiveActivityTab, 
    setSidebarOpen, 
    setAiPanelOpen, 
    setQuickOpenOpen,
    setCreateProjectOpen,
    setJoinRoomOpen,
    setInviteModalOpen,
    setAuthModalOpen,
    showConfirm,
    showToast
  } = useUIStore();

  const { currentProject, collaborators } = useProjectStore();
  const { user, isAuthenticated, logout } = useAuthStore();

  if (!isMobileMenuOpen) return null;

  const handleSelectNav = (action: () => void) => {
    setMobileMenuOpen(false);
    action();
  };

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    const confirmed = await showConfirm({
      title: 'Log Out',
      message: 'Are you sure you want to log out of CodeSync AI?',
      confirmText: 'Log Out',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (confirmed) {
      logout();
      showToast('Logged out successfully', 'info');
    }
  };

  const roomCode = currentProject
    ? (currentProject.roomCode || currentProject.room_code || currentProject.id.slice(0, 8).toUpperCase())
    : '';

  return (
    <div className="fixed inset-0 z-50 flex md:hidden">
      {/* Backdrop */}
      <div 
        onClick={() => setMobileMenuOpen(false)}
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity animate-fade-in"
      />

      {/* Drawer Body */}
      <div className="relative w-[82vw] max-w-xs bg-ide-sidebar border-r border-ide-border h-full flex flex-col z-10 shadow-2xl select-none font-sans">
        {/* Header */}
        <div className="h-12 px-4 border-b border-ide-border flex items-center justify-between bg-ide-activity shrink-0">
          <div className="flex items-center gap-2 font-semibold text-white">
            <Code2 className="w-5 h-5 text-ide-blue" />
            <span className="text-ide-base font-bold">CodeSync AI</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 text-ide-muted hover:text-white rounded hover:bg-[#2a2d2e] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Project Card */}
        <div className="p-3 border-b border-ide-border bg-[#181818]">
          <div className="text-[10px] uppercase font-semibold text-ide-muted tracking-wider mb-1">
            Current Project
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <FolderGit2 className="w-4 h-4 text-ide-blue shrink-0" />
              <span className="text-xs font-medium text-white truncate">
                {currentProject ? currentProject.name : 'No project open'}
              </span>
            </div>
            {currentProject && (
              <span className="text-[9px] px-1.5 py-0.5 bg-ide-border text-ide-dim rounded uppercase font-mono shrink-0">
                {currentProject.role || 'editor'}
              </span>
            )}
          </div>

          {currentProject && (
            <div className="mt-2.5 pt-2 border-t border-ide-border/50 flex items-center justify-between text-ide-xs">
              <span className="text-ide-dim font-mono text-[11px]">Room: {roomCode}</span>
              <button
                onClick={() => handleSelectNav(() => setInviteModalOpen(true))}
                className="text-ide-blue hover:text-ide-blueHover flex items-center gap-1 text-[11px] font-medium"
              >
                <Share2 className="w-3 h-3" />
                <span>Invite</span>
              </button>
            </div>
          )}
        </div>

        {/* Main Navigation Options */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1 text-ide-sm">
          <button
            onClick={() => handleSelectNav(() => {
              setActiveActivityTab('explorer');
              setSidebarOpen(true);
            })}
            className="w-full px-3 py-2.5 rounded hover:bg-[#2a2d2e] text-ide-text hover:text-white flex items-center gap-3 transition-colors text-left"
          >
            <Files className="w-4 h-4 text-ide-blue" />
            <span className="font-medium">Files & Explorer</span>
          </button>

          <button
            onClick={() => handleSelectNav(() => setQuickOpenOpen(true))}
            className="w-full px-3 py-2.5 rounded hover:bg-[#2a2d2e] text-ide-text hover:text-white flex items-center gap-3 transition-colors text-left"
          >
            <Search className="w-4 h-4 text-ide-blue" />
            <span className="font-medium">Search Files (Ctrl+P)</span>
          </button>

          <button
            onClick={() => handleSelectNav(() => setAiPanelOpen(true))}
            className="w-full px-3 py-2.5 rounded hover:bg-[#2a2d2e] text-ide-text hover:text-white flex items-center gap-3 transition-colors text-left"
          >
            <Sparkles className="w-4 h-4 text-ide-amber" />
            <span className="font-medium">AI Pair Programmer</span>
          </button>

          <button
            onClick={() => handleSelectNav(() => {
              setActiveActivityTab('collaborators');
              setSidebarOpen(true);
            })}
            className="w-full px-3 py-2.5 rounded hover:bg-[#2a2d2e] text-ide-text hover:text-white flex items-center justify-between transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 text-ide-green" />
              <span className="font-medium">Collaborators</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.2 bg-ide-blue text-white rounded-full font-bold">
              {collaborators.length + (user ? 1 : 0)}
            </span>
          </button>

          <div className="my-2 border-t border-ide-border/50" />

          <button
            onClick={() => handleSelectNav(() => setCreateProjectOpen(true))}
            className="w-full px-3 py-2 rounded hover:bg-[#2a2d2e] text-ide-text hover:text-white flex items-center gap-3 transition-colors text-left"
          >
            <Plus className="w-4 h-4 text-ide-blue" />
            <span>New Project</span>
          </button>

          <button
            onClick={() => handleSelectNav(() => setJoinRoomOpen(true))}
            className="w-full px-3 py-2 rounded hover:bg-[#2a2d2e] text-ide-text hover:text-white flex items-center gap-3 transition-colors text-left"
          >
            <DoorOpen className="w-4 h-4 text-ide-blue" />
            <span>Join Room</span>
          </button>

          <button
            onClick={() => handleSelectNav(() => {
              setActiveActivityTab('settings');
              setSidebarOpen(true);
            })}
            className="w-full px-3 py-2 rounded hover:bg-[#2a2d2e] text-ide-text hover:text-white flex items-center gap-3 transition-colors text-left"
          >
            <Settings className="w-4 h-4 text-ide-muted" />
            <span>Settings</span>
          </button>
        </div>

        {/* Footer / User Profile */}
        <div className="p-3 border-t border-ide-border bg-ide-activity shrink-0">
          {isAuthenticated && user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-ide-blue flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
                  {user.username.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-white truncate">{user.username}</div>
                  <div className="text-[10px] text-ide-muted truncate">{user.email || 'Online'}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-ide-muted hover:text-ide-red rounded transition-colors"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleSelectNav(() => setAuthModalOpen(true))}
              className="w-full py-1.5 px-3 bg-ide-blue hover:bg-ide-blueHover text-white text-xs font-medium rounded flex items-center justify-center gap-1.5 transition-colors"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Sign In / Register</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
