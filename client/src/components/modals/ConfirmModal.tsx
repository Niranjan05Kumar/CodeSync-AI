import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, HelpCircle, X } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';

export const ConfirmModal: React.FC = () => {
  const { confirmDialog, closeConfirm } = useUIStore();
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!confirmDialog) return;

    // Auto-focus confirm button
    const timer = setTimeout(() => {
      confirmButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeConfirm(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        closeConfirm(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [confirmDialog, closeConfirm]);

  if (!confirmDialog) return null;

  const {
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'warning'
  } = confirmDialog;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
      {/* Background click cancels */}
      <div 
        className="fixed inset-0" 
        onClick={() => closeConfirm(false)} 
      />

      <div 
        className="relative w-[440px] max-w-[92vw] bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#333333]">
          <div className="flex items-center gap-2.5">
            {type === 'danger' && (
              <div className="w-6 h-6 rounded-full bg-red-950/60 border border-red-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </div>
            )}
            {type === 'warning' && (
              <div className="w-6 h-6 rounded-full bg-amber-950/60 border border-amber-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              </div>
            )}
            {type === 'info' && (
              <div className="w-6 h-6 rounded-full bg-blue-950/60 border border-blue-500/30 flex items-center justify-center shrink-0">
                <HelpCircle className="w-3.5 h-3.5 text-[#007acc]" />
              </div>
            )}
            <h3 className="text-white text-ide-sm font-semibold tracking-wide">
              {title}
            </h3>
          </div>

          <button
            onClick={() => closeConfirm(false)}
            className="text-ide-dim hover:text-white p-1 rounded hover:bg-[#333333] transition-colors"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          <p className="text-[#cccccc] text-ide-sm leading-relaxed whitespace-pre-wrap">
            {message}
          </p>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-2.5 px-4 py-3 bg-[#1e1e1e] border-t border-[#333333]">
          <button
            type="button"
            onClick={() => closeConfirm(false)}
            className="px-3.5 py-1.5 bg-[#3c3c3c] hover:bg-[#4a4a4a] text-ide-text hover:text-white text-ide-xs rounded font-medium transition-colors"
          >
            {cancelText}
          </button>

          <button
            ref={confirmButtonRef}
            type="button"
            onClick={() => closeConfirm(true)}
            className={`px-3.5 py-1.5 text-white text-ide-xs rounded font-medium shadow-sm transition-colors ${
              type === 'danger'
                ? 'bg-[#c72e2e] hover:bg-[#d83b3b]'
                : type === 'warning'
                ? 'bg-[#d97706] hover:bg-[#b45309]'
                : 'bg-ide-blue hover:bg-ide-blue-hover'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
