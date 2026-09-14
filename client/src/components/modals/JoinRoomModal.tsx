import React, { useState } from 'react';
import { X, DoorOpen, Loader2, AlertCircle, ArrowRight, ShieldAlert } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useAuthStore } from '../../store/useAuthStore';

export const JoinRoomModal: React.FC = () => {
  const { isJoinRoomOpen, setJoinRoomOpen, setAuthModalOpen, showToast } = useUIStore();
  const { joinRoom } = useProjectStore();
  const { isAuthenticated } = useAuthStore();

  const [inputCode, setInputCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isJoinRoomOpen) return null;

  // Enforce authentication: unauthenticated users cannot join rooms
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
        <div className="bg-ide-elevated border border-ide-border rounded-lg shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-ide-border bg-ide-sidebar">
            <div className="flex items-center gap-2 font-semibold text-white">
              <ShieldAlert className="w-5 h-5 text-ide-amber" />
              <span>Authentication Required</span>
            </div>
            <button
              onClick={() => setJoinRoomOpen(false)}
              className="p-1 text-ide-muted hover:text-white rounded hover:bg-ide-activity transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-ide-sm text-ide-dim">
              You must be logged in to CodeSync AI to join a collaborative room and write code with team members.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setJoinRoomOpen(false)}
                className="px-4 py-2 rounded text-ide-sm text-ide-dim hover:text-white hover:bg-ide-activity transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setJoinRoomOpen(false);
                  setAuthModalOpen(true);
                }}
                className="px-4 py-2 rounded text-ide-sm font-medium bg-ide-blue hover:bg-ide-blueHover text-white transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <span>Sign In or Register</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    // If user pasted a full URL, parse out the room query parameter
    if (val.includes('?room=')) {
      const match = val.match(/[?&]room=([^&#]+)/);
      if (match && match[1]) {
        val = match[1];
      }
    } else if (val.includes('/')) {
      const parts = val.split('/');
      val = parts[parts.length - 1];
    }
    const cleanVal = val.trim().toUpperCase();
    setInputCode(cleanVal);
    if (error) setError(null);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = inputCode.trim();

    if (!code) {
      setError('Please enter an 8-character Room ID');
      return;
    }

    if (code.length < 6) {
      setError('Room ID must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const project = await joinRoom(code);
      showToast(`Joined room "${project.name}" (${project.roomCode || code})!`, 'success');
      setInputCode('');
      setJoinRoomOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to join room. Please check the 8-character code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-ide-elevated border border-ide-border rounded-lg shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-ide-border bg-ide-sidebar">
          <div className="flex items-center gap-2 font-semibold text-white">
            <DoorOpen className="w-5 h-5 text-ide-blue" />
            <span>Join Collaborative Room</span>
          </div>
          <button
            onClick={() => setJoinRoomOpen(false)}
            className="p-1 text-ide-muted hover:text-white rounded hover:bg-ide-activity transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleJoin} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-ide-red/10 border border-ide-red/30 rounded flex items-start gap-2.5 text-ide-red text-ide-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-ide-xs font-semibold uppercase tracking-wider text-ide-dim">
                Room ID (8 Characters)
              </label>
              <span className="text-ide-xs text-ide-muted font-mono">
                {inputCode.length}/8
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                autoFocus
                placeholder="e.g. H7N9P2Q4 or paste invite link"
                value={inputCode}
                onChange={handleInputChange}
                maxLength={36}
                className="w-full px-3.5 py-2.5 bg-ide-activity border border-ide-border rounded text-white font-mono text-base tracking-widest uppercase placeholder:normal-case placeholder:font-sans placeholder:tracking-normal placeholder:text-ide-muted outline-none focus:border-ide-blue transition-colors text-center"
              />
            </div>
            <p className="text-ide-xs text-ide-muted leading-relaxed">
              Enter the 8-character alphanumeric Room ID provided by the project host, or paste an invite link.
            </p>
          </div>

          <div className="bg-[#1e1e1e] border border-ide-border rounded p-3 text-ide-xs text-ide-dim space-y-1.5">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <span>💡 Real-Time Collaboration</span>
            </div>
            <p>
              Once joined, your changes will sync instantly with collaborators in real-time. You can run code together, chat, and see remote cursors.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setJoinRoomOpen(false)}
              disabled={isLoading}
              className="px-4 py-2 rounded text-ide-sm text-ide-dim hover:text-white hover:bg-ide-activity transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !inputCode.trim()}
              className="px-4 py-2 rounded text-ide-sm font-medium bg-ide-blue hover:bg-ide-blueHover text-white transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Joining...</span>
                </>
              ) : (
                <>
                  <DoorOpen className="w-4 h-4" />
                  <span>Join Room</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
