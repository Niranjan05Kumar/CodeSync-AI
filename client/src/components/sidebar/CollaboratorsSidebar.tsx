import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Copy, 
  Check, 
  Radio, 
  FileText, 
  Share2,
  Shield,
  X
} from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';

export const CollaboratorsSidebar: React.FC = () => {
  const { currentProject, collaborators, openTabs, activeTabId } = useProjectStore();
  const { user } = useAuthStore();
  const { setInviteModalOpen, setSidebarOpen, showToast, cursorPosition } = useUIStore();
  const [copiedCode, setCopiedCode] = useState(false);

  const roomCode = currentProject?.roomCode || currentProject?.room_code || '';
  const activeTab = openTabs.find((t) => t.id === activeTabId);
  const totalInRoom = collaborators.length + (user ? 1 : 0);

  const handleCopyRoomCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    showToast(`Room Code "${roomCode}" copied to clipboard!`, 'info');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-ide-sidebar border-r border-ide-border select-none overflow-hidden">
      {/* Sidebar Header */}
      <div className="h-9 px-3 flex items-center justify-between border-b border-ide-border shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-ide-xs font-semibold tracking-wider text-ide-muted uppercase">
            Collaborators
          </span>
          <span className="px-1.5 py-0.2 bg-ide-elevated text-ide-blue text-[10px] rounded-full font-bold">
            {totalInRoom}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {currentProject && (
            <button
              onClick={() => setInviteModalOpen(true)}
              title="Invite & Share Room Code"
              className="p-1 rounded text-ide-dim hover:text-white hover:bg-[#2a2d2e] transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setSidebarOpen(false)}
            title="Close Drawer"
            className="p-1 rounded text-ide-dim hover:text-white hover:bg-[#2a2d2e] transition-colors xl:hidden"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Room Information Card */}
        {currentProject && (
          <div className="p-2.5 bg-[#252526] border border-ide-border rounded space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-ide-dim">Room Code</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-[#1b1b1c] text-ide-green rounded font-mono flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 animate-pulse" /> Live Sync
              </span>
            </div>

            <div className="flex items-center justify-between bg-[#1b1b1c] px-2.5 py-1.5 rounded border border-ide-border/50">
              <span className="font-mono text-xs font-semibold text-white tracking-widest">
                {roomCode || 'NO ROOM CODE'}
              </span>
              <button
                onClick={handleCopyRoomCode}
                disabled={!roomCode}
                className="p-1 text-ide-dim hover:text-white rounded transition-colors disabled:opacity-30"
                title="Copy Room Code"
              >
                {copiedCode ? (
                  <Check className="w-3.5 h-3.5 text-ide-green" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <button
              onClick={() => setInviteModalOpen(true)}
              className="w-full py-1 px-2 bg-ide-blue hover:bg-ide-blueHover text-white text-[11px] font-medium rounded flex items-center justify-center gap-1.5 transition-colors"
            >
              <Share2 className="w-3 h-3" />
              <span>Share & Invite</span>
            </button>
          </div>
        )}

        {/* Current User (You) */}
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase font-semibold text-ide-muted tracking-wider px-1">
            You
          </div>
          <div className="p-2 bg-[#252526] border border-ide-border/80 rounded flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative">
                <div className="w-7 h-7 rounded-full bg-ide-blue flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
                  {user ? user.username.slice(0, 1) : 'Y'}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-ide-green rounded-full border-2 border-[#252526]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-white truncate">
                    {user?.username || 'You'}
                  </span>
                  <span className="text-[9px] px-1 bg-ide-border text-ide-dim rounded uppercase">
                    You
                  </span>
                  {currentProject?.role === 'owner' && (
                    <span className="text-[9px] px-1 bg-[#4a3512] text-ide-amber rounded flex items-center gap-0.5">
                      <Shield className="w-2.5 h-2.5" /> Owner
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-ide-dim truncate flex items-center gap-1 mt-0.5">
                  <FileText className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate">
                    {activeTab ? activeTab.name : 'No active file'}
                  </span>
                  <span className="text-ide-muted shrink-0">
                    (Ln {cursorPosition.lineNumber}, Col {cursorPosition.column})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Remote Collaborators */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] uppercase font-semibold text-ide-muted tracking-wider px-1">
            <span>Online Peers</span>
            <span>{collaborators.length}</span>
          </div>

          {collaborators.length > 0 ? (
            <div className="space-y-1.5">
              {collaborators.map((collab) => (
                <div
                  key={collab.id}
                  className="p-2 bg-[#252526] hover:bg-[#2a2a2b] border border-ide-border rounded transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative">
                      <div
                        style={{ backgroundColor: collab.color }}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase shrink-0 shadow-sm"
                      >
                        {collab.username.slice(0, 1)}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-ide-green rounded-full border-2 border-[#252526]" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-white truncate">
                          {collab.username}
                        </span>
                        <div
                          style={{ backgroundColor: collab.color }}
                          className="w-2 h-2 rounded-full shrink-0"
                          title={`Cursor color: ${collab.color}`}
                        />
                      </div>

                      <div className="text-[10px] text-ide-dim truncate flex items-center gap-1 mt-0.5">
                        {collab.cursorPosition ? (
                          <span>
                            Ln {collab.cursorPosition.lineNumber}, Col {collab.cursorPosition.column}
                          </span>
                        ) : (
                          <span>In room</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-[#252526]/50 border border-dashed border-ide-border rounded text-center space-y-2">
              <Users className="w-7 h-7 text-ide-dim mx-auto opacity-50" />
              <div className="text-xs text-ide-dim">No other collaborators online</div>
              <p className="text-[10px] text-ide-dim leading-relaxed">
                Share your room code to start coding and editing files together in real time.
              </p>
              {currentProject && (
                <button
                  onClick={() => setInviteModalOpen(true)}
                  className="px-2.5 py-1 bg-ide-elevated hover:bg-[#2f2f30] border border-ide-border rounded text-[11px] text-white transition-colors"
                >
                  Invite Teammates
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
