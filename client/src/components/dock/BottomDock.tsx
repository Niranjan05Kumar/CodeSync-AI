import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  Terminal, 
  Send, 
  CheckCircle2, 
  Maximize2, 
  Minimize2
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useSocketSync } from '../../hooks/useSocketSync';

export const BottomDock: React.FC = () => {
  const { 
    isBottomPanelOpen, 
    activeBottomTab, 
    setActiveBottomTab, 
    setBottomPanelOpen,
    bottomPanelHeight
  } = useUIStore();

  const { user } = useAuthStore();
  const { chatMessages } = useProjectStore();
  const { broadcastChatMessage } = useSocketSync();

  const [isMaximized, setIsMaximized] = useState(false);
  const [outputLogs, setOutputLogs] = useState<string[]>([
    '[system] CodeSync Cloud Execution Engine initialized.',
    '[system] Docker sandbox runner connected: alpine-sandbox (memory limit: 128MB, cpu: 0.5)',
    '[system] Project workspace mounted at /workspace'
  ]);

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

  const handleClear = () => {
    if (activeBottomTab === 'output') setOutputLogs([]);
    if (activeBottomTab === 'terminal') setTerminalHistory([]);
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

  return (
    <div
      style={{ height: isMaximized ? 'calc(100vh - 64px)' : `${bottomPanelHeight}px` }}
      className="w-full bg-[#181818] border-t border-ide-border flex flex-col z-20 transition-[height] duration-150"
    >
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
            onClick={() => setActiveBottomTab('problems')}
            className={`h-full px-3 text-ide-xs tracking-wider font-medium uppercase transition-colors border-b-2 flex items-center gap-1.5 ${
              activeBottomTab === 'problems'
                ? 'border-ide-blue text-white font-semibold'
                : 'border-transparent text-ide-muted hover:text-white'
            }`}
          >
            Problems
            <span className="ml-1 px-1.5 py-0.2 bg-[#2d2d2d] text-ide-dim text-[10px] rounded-full">
              0
            </span>
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
          {(activeBottomTab === 'output' || activeBottomTab === 'terminal') && (
            <button
              onClick={handleClear}
              title="Clear Console"
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
          <div className="h-full overflow-y-auto space-y-1 select-text">
            {outputLogs.map((log, idx) => (
              <div key={idx} className="leading-relaxed text-ide-dim text-ide-xs">
                {log}
              </div>
            ))}
            <div className="pt-2 text-ide-dim text-ide-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-ide-green" />
              <span>Ready for code execution (Press Ctrl+Enter to run).</span>
            </div>
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

        {/* PROBLEMS TAB */}
        {activeBottomTab === 'problems' && (
          <div className="h-full flex flex-col items-center justify-center text-ide-muted text-ide-sm">
            <CheckCircle2 className="w-8 h-8 text-ide-green mb-2 opacity-80" />
            <p>No problems have been detected in the workspace.</p>
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
                  <div key={msg.id} className="flex items-start gap-2.5">
                    <div
                      style={{ backgroundColor: msg.color || '#4fc1ff' }}
                      className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-black uppercase shrink-0"
                    >
                      {msg.username.substring(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-ide-xs font-semibold text-white truncate">
                          {msg.username}
                        </span>
                        {timeStr && <span className="text-[10px] text-ide-dim">{timeStr}</span>}
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
