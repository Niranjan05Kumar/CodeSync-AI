import React, { useState, useEffect } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  UserPlus, 
  Users, 
  Crown, 
  Shield, 
  Trash2, 
  Loader2, 
  AlertCircle 
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useAuthStore } from '../../store/useAuthStore';
import { projectApi } from '../../api/projectApi';

interface MemberItem {
  user_id: string;
  username: string;
  email: string;
  avatar_url?: string | null;
  role: 'owner' | 'editor' | 'viewer';
  joined_at?: string;
}

export const InviteModal: React.FC = () => {
  const { isInviteModalOpen, setInviteModalOpen, showToast, showConfirm } = useUIStore();
  const { currentProject, collaborators, inviteMember, removeMember } = useProjectStore();
  const { user } = useAuthStore();

  const [copiedId, setCopiedId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [inviteInput, setInviteInput] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [members, setMembers] = useState<MemberItem[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  const roomCode = currentProject
    ? (currentProject.roomCode || currentProject.room_code || currentProject.id.slice(0, 8).toUpperCase())
    : '';

  const inviteUrl = typeof window !== 'undefined' && roomCode
    ? `${window.location.origin}/?room=${roomCode}`
    : '';

  const isOwner = currentProject && user && currentProject.owner_id === user.id;

  // Load project member roster when modal opens
  useEffect(() => {
    if (!isInviteModalOpen || !currentProject) return;

    let isMounted = true;
    setIsLoadingMembers(true);

    projectApi.getProjectById(currentProject.id)
      .then((res) => {
        if (isMounted && res.project?.members) {
          setMembers(res.project.members);
        }
      })
      .catch((err) => {
        console.warn('Failed to load project members:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingMembers(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isInviteModalOpen, currentProject]);

  if (!isInviteModalOpen || !currentProject) return null;

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopiedId(true);
      showToast(`Copied Room ID: ${roomCode}`, 'success');
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      showToast('Copied room invite link to clipboard!', 'success');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteInput.trim()) return;

    setIsInviting(true);
    setInviteError(null);

    try {
      const newMember = await inviteMember(inviteInput.trim(), inviteRole);
      showToast(`Invited ${newMember.username} as ${newMember.role}!`, 'success');
      setInviteInput('');
      // Update local members list
      setMembers((prev) => {
        const filtered = prev.filter((m) => m.user_id !== newMember.userId);
        return [
          ...filtered,
          {
            user_id: newMember.userId,
            username: newMember.username,
            email: newMember.email,
            avatar_url: newMember.avatarUrl,
            role: newMember.role,
            joined_at: newMember.joinedAt
          }
        ];
      });
    } catch (err: any) {
      setInviteError(err.message || 'Failed to invite user');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (member: MemberItem) => {
    const confirmed = await showConfirm({
      title: 'Remove Collaborator',
      message: `Are you sure you want to remove ${member.username} from this project?`,
      confirmText: 'Remove',
      cancelText: 'Cancel',
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      await removeMember(member.user_id);
      setMembers((prev) => prev.filter((m) => m.user_id !== member.user_id));
      showToast(`Removed ${member.username}`, 'info');
    } catch (err: any) {
      showToast(`Failed to remove: ${err.message}`, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-ide-elevated border border-ide-border rounded-lg shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-ide-border bg-ide-sidebar">
          <div className="flex items-center gap-2 font-semibold text-white">
            <Share2 className="w-4 h-4 text-ide-blue" />
            <span>Share & Invite Collaborators</span>
          </div>
          <button
            onClick={() => setInviteModalOpen(false)}
            className="p-1 text-ide-muted hover:text-white rounded hover:bg-ide-activity transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          {/* 1. 8-Character Room ID Box */}
          <div className="p-3.5 bg-ide-activity border border-ide-border rounded-lg flex items-center justify-between gap-3">
            <div>
              <div className="text-ide-xs text-ide-muted uppercase tracking-wider font-semibold">
                8-Character Room ID
              </div>
              <div className="font-mono text-xl font-bold text-white tracking-widest mt-0.5 select-all">
                {roomCode}
              </div>
            </div>

            <button
              onClick={handleCopyId}
              className="h-8 px-3 rounded bg-ide-elevated hover:bg-[#2d2d2d] border border-ide-border text-white text-ide-xs font-medium flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
            >
              {copiedId ? (
                <>
                  <Check className="w-3.5 h-3.5 text-ide-green" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-ide-muted" />
                  <span>Copy ID</span>
                </>
              )}
            </button>
          </div>

          {/* 2. Direct Share Link */}
          <div className="space-y-1.5">
            <label className="text-ide-xs text-ide-muted uppercase tracking-wider font-semibold">
              Invite Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={inviteUrl}
                className="flex-1 px-3 py-1.5 bg-ide-activity border border-ide-border rounded text-white text-ide-xs font-mono select-all outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="h-7 px-3 bg-ide-blue hover:bg-ide-blueHover text-white rounded text-ide-xs font-medium flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-ide-xs text-ide-muted">
              Anyone with this link or 8-character ID can sign in and join this room in real-time.
            </p>
          </div>

          {/* 3. Direct Invite by Username/Email (for project owners/editors) */}
          <div className="pt-2 border-t border-ide-border space-y-2">
            <label className="text-ide-xs text-ide-muted uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-ide-blue" />
              <span>Invite by Username or Email</span>
            </label>

            {inviteError && (
              <div className="p-2.5 bg-ide-red/10 border border-ide-red/30 rounded flex items-center gap-2 text-ide-red text-ide-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{inviteError}</span>
              </div>
            )}

            <form onSubmit={handleInvite} className="flex gap-2">
              <input
                type="text"
                placeholder="Username or email address..."
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-ide-activity border border-ide-border rounded text-white text-ide-xs outline-none focus:border-ide-blue"
              />

              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                className="px-2.5 py-1.5 bg-ide-activity border border-ide-border rounded text-white text-ide-xs outline-none focus:border-ide-blue cursor-pointer"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>

              <button
                type="submit"
                disabled={isInviting || !inviteInput.trim()}
                className="px-3.5 py-1.5 bg-ide-elevated hover:bg-[#2d2d2d] border border-ide-border rounded text-white text-ide-xs font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                {isInviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Invite'}
              </button>
            </form>
          </div>

          {/* 4. Room Members List & Live Presence */}
          <div className="pt-2 border-t border-ide-border space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-ide-xs text-ide-muted uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-ide-blue" />
                <span>Room Members ({members.length})</span>
              </span>
              <span className="text-ide-xs text-ide-muted">
                {collaborators.length} currently online
              </span>
            </div>

            {isLoadingMembers ? (
              <div className="py-4 flex items-center justify-center text-ide-muted text-ide-xs gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading members...</span>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {members.map((member) => {
                  const isOnline = collaborators.some((c) => c.id === member.user_id);
                  const isMemberOwner = member.role === 'owner';

                  return (
                    <div
                      key={member.user_id}
                      className="px-3 py-2 bg-ide-activity/60 border border-ide-border rounded flex items-center justify-between text-ide-xs group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Avatar with live online dot */}
                        <div className="relative">
                          <div className="w-6 h-6 rounded-full bg-[#333333] flex items-center justify-center text-white font-bold text-[10px]">
                            {member.username.slice(0, 1).toUpperCase()}
                          </div>
                          {isOnline && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-ide-green ring-1 ring-ide-sidebar animate-pulse" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-white font-medium truncate max-w-[140px]">
                              {member.username}
                            </span>
                            {user?.id === member.user_id && (
                              <span className="text-[10px] text-ide-muted">(You)</span>
                            )}
                          </div>
                          <div className="text-[10px] text-ide-muted truncate max-w-[160px]">
                            {member.email}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Role Badge */}
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 ${
                            isMemberOwner
                              ? 'bg-amber-500/10 text-ide-amber border border-amber-500/30'
                              : member.role === 'editor'
                              ? 'bg-blue-500/10 text-ide-blue border border-blue-500/30'
                              : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/30'
                          }`}
                        >
                          {isMemberOwner ? <Crown className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                          <span className="capitalize">{member.role}</span>
                        </span>

                        {/* Owner can remove members (except themselves) */}
                        {isOwner && !isMemberOwner && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member)}
                            className="p-1 text-ide-muted hover:text-red-400 hover:bg-ide-elevated rounded transition-colors opacity-0 group-hover:opacity-100"
                            title={`Remove ${member.username}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-ide-border bg-ide-sidebar flex justify-end">
          <button
            type="button"
            onClick={() => setInviteModalOpen(false)}
            className="px-4 py-1.5 rounded text-ide-sm text-white bg-ide-elevated hover:bg-[#2d2d2d] border border-ide-border transition-colors font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
