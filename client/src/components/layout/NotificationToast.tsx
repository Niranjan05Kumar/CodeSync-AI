import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';

export const NotificationToast: React.FC = () => {
  const { toasts, removeToast } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <aside aria-label="Notifications" className="fixed bottom-8 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto bg-[#252526] border border-[#3c3c3c] shadow-2xl rounded-md p-3 flex items-start gap-3 animate-in slide-in-from-bottom-2 fade-in duration-200"
          >
            {/* Icon */}
            {toast.type === 'error' && (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            )}
            {toast.type === 'warning' && (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            )}
            {toast.type === 'success' && (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            )}
            {toast.type === 'info' && (
              <Info className="w-4 h-4 text-ide-blue shrink-0 mt-0.5" />
            )}

            {/* Content */}
            <div className="flex-1 text-ide-xs text-[#cccccc] leading-relaxed break-words">
              {toast.message}
            </div>

            {/* Dismiss */}
            <button
              onClick={() => removeToast(toast.id)}
              className="text-ide-dim hover:text-white p-0.5 rounded transition-colors shrink-0"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </aside>
  );
};
