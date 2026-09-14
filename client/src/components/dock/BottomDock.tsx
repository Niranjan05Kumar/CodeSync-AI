import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  Terminal, 
  Send, 
  CheckCircle2, 
  Maximize2, 
  Minimize2,
  Loader2,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useSocketActions } from '../../hooks/useSocketSync';
import { getSocket } from '../../sockets/socketClient';

export const BottomDock: React.FC = () => {
  const { 
    isBottomPanelOpen, 
    activeBottomTab, 
    setActiveBottomTab, 
    setBottomPanelOpen,
    bottomPanelHeight,
    showConfirm,
    showToast
  } = useUIStore();

  const { user } = useAuthStore();
  const { 
    currentProject,
    chatMessages,
    executionLogs,
    isExecuting,
    clearExecutionOutput,
    clearChatMessages,
    deleteChatMessage,
    runActiveFile
  } = useProjectStore();
  const { broadcastChatMessage } = useSocketActions();

  const [isMaximized, setIsMaximized] = useState(false);

  // Terminal state
  const [terminalHistory, setTerminalHistory] = useState<string[]>([
    'CodeSync Cloud Shell v1.0.0 (Linux x86_64)',
    'Type "help" for available commands.',
    ''
  ]);
  const [terminalInput, setTerminalInput] = useState('');

  // Chat input
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  if (!isBottomPanelOpen) return null;

  const handleClear = async () => {
    if (activeBottomTab === 'output') clearExecutionOutput();
    if (activeBottomTab === 'terminal') setTerminalHistory([]);
    if (activeBottomTab === 'chat') {
      if (!currentProject) return;
      if (chatMessages.length === 0) return;
      const confirmed = await showConfirm({
        title: 'Clear Collaborator Chat',
        message: 'Are you sure you want to delete all chat messages in this project? This will permanently wipe chat history for all collaborators.',
        confirmText: 'Clear Chat',
        type: 'danger'
      });
      if (!confirmed) return;

      const socket = getSocket();
      if (socket.connected) {
        socket.emit('chat:clear', { projectId: currentProject.id });
      }
      clearChatMessages();
      showToast('Collaborator chat cleared', 'info');
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!currentProject || !messageId) return;
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('chat:delete', { projectId: currentProject.id, messageId });
    }
    deleteChatMessage(messageId);
    showToast('Message deleted', 'info');
  };

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = terminalInput.trim();
    if (!cmd) return;

    const newHistory = [...terminalHistory, `user@codesync:~$ ${cmd}`];

    if (cmd === 'clear') {
      setTerminalHistory([]);
      setTerminalInput('');
      return;
    } else if (cmd === 'help') {
      newHistory.push(
        'Available commands:',
        '  help      Show this help menu',
        '  clear     Clear terminal output',
        '  ls        List files in project',
        '  whoami    Print current user',
        '  uname     Print system information',
        '  run       Run active file in Docker sandbox'
      );
    } else if (cmd === 'whoami') {
      newHistory.push(user ? user.username : 'anonymous');
    } else if (cmd === 'uname') {
      newHistory.push('Linux codesync-sandbox 6.1.0-docker x86_64 GNU/Linux');
    } else if (cmd === 'ls') {
      newHistory.push('main.py  package.json  README.md  src/');
    } else if (cmd === 'run') {
      runActiveFile();
      newHistory.push('Executing active file in Docker sandbox...');
    } else {
      newHistory.push(`bash: ${cmd}: command not found in sandbox`);
    }

    setTerminalHistory(newHistory);
    setTerminalInput('');
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    broadcastChatMessage(chatInput.trim());
    setChatInput('');
  };

  if (!isBottomPanelOpen) {
    return (
      <div 
        onClick={() => setBottomPanelOpen(true)}
        className="h-7 w-full bg-[#1e1e1e] border-t border-ide-border px-3 flex items-center justify-between text-ide-xs text-ide-muted hover:text-white cursor-pointer select-none transition-colors z-20 shrink-0"
        title="Click to expand Output / Terminal / Chat"
      >
        <div className="flex items-center gap-2">
          <ChevronUp className="w-3.5 h-3.5 text-ide-blue shrink-0" />
          <span className="font-semibold text-white uppercase text-[10px] tracking-wider">
            {activeBottomTab}
          </span>
          <span className="text-[10px] text-ide-dim hidden sm:inline">• Click to expand</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-ide-muted font-mono">
          <span className={activeBottomTab === 'output' ? 'text-ide-blue font-semibold' : ''}>OUTPUT</span>
          <span>•</span>
          <span className={activeBottomTab === 'terminal' ? 'text-ide-blue font-semibold' : ''}>TERMINAL</span>
          <span>•</span>
          <span className={activeBottomTab === 'chat' ? 'text-ide-blue font-semibold' : ''}>
            CHAT {chatMessages.length > 0 && `(${chatMessages.length})`}
          </span>
        </div>
      </div>
    );
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div
      style={{ 
        height: isMaximized 
          ? 'calc(100vh - 64px)' 
          : isMobile 
          ? '45vh' 
          : `${bottomPanelHeight}px` 
      }}
      className="w-full bg-[#181818] border-t border-ide-border flex flex-col z-20 transition-[height] duration-150 shrink-0 select-none font-sans"
    >
      {/* Mobile Drawer Grab Bar */}
      <div 
        onClick={() => setIsMaximized(!isMaximized)}
        className="w-10 h-1 bg-[#3c3c3d] rounded-full mx-auto my-1 md:hidden cursor-pointer shrink-0" 
        title="Tap to toggle size"
      />

      {/* Panel Header */}
      <div className="h-8 px-2 flex items-center justify-between border-b border-ide-border/60 bg-[#1e1e1e] shrink-0 select-none">
        {/* Tabs */}
        <div className="flex items-center h-full gap-1">
          <button
            onClick={() => setActiveBottomTab('output')}
            className={`h-full px-3 text-ide-xs tracking-wider font-medium uppercase transition-colors border-b-2 flex items-center gap-1.5 ${
              activeBottomTab === 'output'
                ? 'border-ide-blue text-white font-semibold'
                : 'border-transparent text-ide-muted hover:text-white'
            }`}
          >
            Output
          </button>
          <button
            onClick={() => setActiveBottomTab('terminal')}
            className={`h-full px-3 text-ide-xs tracking-wider font-medium uppercase transition-colors border-b-2 flex items-center gap-1.5 ${
              activeBottomTab === 'terminal'
                ? 'border-ide-blue text-white font-semibold'
                : 'border-transparent text-ide-muted hover:text-white'
            }`}
          >
            <Terminal className="w-3 h-3" />
            Terminal
          </button>
          <button
            onClick={() => setActiveBottomTab('chat')}
            className={`h-full px-3 text-ide-xs tracking-wider font-medium uppercase transition-colors border-b-2 flex items-center gap-1.5 ${
              activeBottomTab === 'chat'
                ? 'border-ide-blue text-white font-semibold'
                : 'border-transparent text-ide-muted hover:text-white'
            }`}
          >
            Chat
            <span className="ml-1 px-1.5 py-0.2 bg-[#2d2d2d] text-ide-blue text-[10px] rounded-full">
              {chatMessages.length}
            </span>
          </button>
        </div>

        {/* Panel Actions */}
        <div className="flex items-center gap-1 text-ide-muted">
          {(activeBottomTab === 'output' || activeBottomTab === 'terminal' || activeBottomTab === 'chat') && (
            <button
              onClick={handleClear}
              title={activeBottomTab === 'chat' ? 'Clear Collaborator Chat' : 'Clear Console'}
              className="p-1 hover:text-white hover:bg-[#2a2d2e] rounded transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            title={isMaximized ? 'Restore Panel Size' : 'Maximize Panel Size'}
            className="p-1 hover:text-white hover:bg-[#2a2d2e] rounded transition-colors"
          >
            {isMaximized ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={() => setBottomPanelOpen(false)}
            title="Close Panel (Ctrl+J)"
            className="p-1 hover:text-white hover:bg-[#2a2d2e] rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-hidden bg-[#181818] p-2 font-mono text-ide-sm text-ide-text">
        {/* OUTPUT TAB */}
        {activeBottomTab === 'output' && (
          <div className="h-full overflow-y-auto space-y-1.5 select-text p-1 font-mono text-ide-xs">
            {executionLogs.map((log) => {
              let textClass = 'text-ide-dim';

              if (log.type === 'stdout') {
                textClass = 'text-white whitespace-pre-wrap';
              } else if (log.type === 'stderr') {
                textClass = 'text-ide-red whitespace-pre-wrap';
              } else if (log.type === 'success') {
                textClass = 'text-ide-green font-medium';
              } else if (log.type === 'error') {
                textClass = 'text-ide-red font-medium';
              } else if (log.type === 'system') {
                textClass = 'text-ide-blue font-medium';
              }

              return (
                <div key={log.id} className="leading-relaxed flex items-start gap-2">
                  <span className="text-[10px] text-ide-muted select-none shrink-0 font-sans mt-0.5">
                    {log.timestamp}
                  </span>
                  <div className={`flex-1 ${textClass}`}>
                    {log.text}
                  </div>
                </div>
              );
            })}

            {isExecuting && (
              <div className="pt-2 text-ide-amber text-ide-xs flex items-center gap-2 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span>Running code execution in isolated sandbox...</span>
              </div>
            )}

            {!isExecuting && (
              <div className="pt-2 text-ide-dim text-ide-xs flex items-center gap-1.5 border-t border-ide-border/20 mt-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-ide-green shrink-0" />
                <span>
                  Ready for code execution (Press{' '}
                  <kbd className="px-1 py-0.5 bg-[#252526] text-white rounded border border-ide-border font-mono text-[10px]">
                    Ctrl+Enter
                  </kbd>{' '}
                  or{' '}
                  <button
                    onClick={() => runActiveFile()}
                    className="text-ide-blue hover:text-ide-blueHover underline cursor-pointer"
                  >
                    click Run
                  </button>
                  ).
                </span>
              </div>
            )}
          </div>
        )}

        {/* TERMINAL TAB */}
        {activeBottomTab === 'terminal' && (
          <div className="h-full flex flex-col font-mono text-ide-xs select-text">
            <div className="flex-1 overflow-y-auto space-y-0.5">
              {terminalHistory.map((line, idx) => (
                <div key={idx} className="leading-relaxed text-ide-text">
                  {line}
                </div>
              ))}
            </div>
            <form onSubmit={handleTerminalSubmit} className="flex items-center gap-2 pt-1 border-t border-ide-border/30">
              <span className="text-ide-green select-none">user@codesync:~$</span>
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                placeholder="Type shell command..."
                className="flex-1 bg-transparent text-white outline-none font-mono text-ide-xs"
              />
            </form>
          </div>
        )}


        {/* CHAT TAB */}
        {activeBottomTab === 'chat' && (
          <div className="h-full flex flex-col font-sans">
            {/* Messages Stream */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 select-text">
              {chatMessages.map((msg) => {
                const timeStr = msg.createdAt 
                  ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                  : '';

                return (
                  <div key={msg.id} className="group flex items-start gap-2.5 p-1 rounded hover:bg-[#252526]/50 transition-colors">
                    <div
                      style={{ backgroundColor: msg.color || '#4fc1ff' }}
                      className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-black uppercase shrink-0"
                    >
                      {msg.username.substring(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-ide-xs font-semibold text-white truncate">
                            {msg.username}
                          </span>
                          {timeStr && <span className="text-[10px] text-ide-dim">{timeStr}</span>}
                        </div>
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          title="Delete message"
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-ide-red text-ide-dim rounded transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-ide-sm text-ide-text mt-0.5 leading-relaxed break-words">
                        {msg.message}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Input Box */}
            <form onSubmit={handleSendChat} className="mt-2 pt-2 border-t border-ide-border flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Send a message to collaborators..."
                className="flex-1 px-3 py-1.5 bg-[#202020] border border-ide-border rounded text-white text-ide-sm outline-none focus:border-ide-blue"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="px-3 py-1.5 bg-ide-blue hover:bg-ide-blueHover text-white rounded text-ide-sm font-medium transition-colors disabled:opacity-40 flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
