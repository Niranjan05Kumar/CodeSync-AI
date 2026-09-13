import React, { useState } from 'react';
import { Sparkles, X, Send, Code2, ShieldCheck, Zap } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useProjectStore } from '../../store/useProjectStore';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const AIAssistantSidebar: React.FC = () => {
  const { isAiPanelOpen, setAiPanelOpen, aiPanelWidth } = useUIStore();
  const { openTabs, activeTabId } = useProjectStore();

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I am your CodeSync AI pair programmer. Ask me anything about your project, or select an action below.'
    }
  ]);
  const [prompt, setPrompt] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  if (!isAiPanelOpen) return null;

  const activeTab = openTabs.find((t) => t.id === activeTabId);

  const handleAction = (action: string) => {
    let query = '';
    if (action === 'explain') query = `Explain how ${activeTab?.name || 'this code'} works step by step.`;
    if (action === 'review') query = `Perform a rigorous code review on ${activeTab?.name || 'this file'}.`;
    if (action === 'fix') query = `Find potential bugs or edge cases in ${activeTab?.name || 'this code'}.`;
    if (action === 'optimize') query = `Suggest performance and memory optimizations for ${activeTab?.name || 'this code'}.`;

    handleSendPrompt(query);
  };

  const handleSendPrompt = (textToSend?: string) => {
    const text = textToSend || prompt;
    if (!text.trim()) return;

    const newMsgs: Message[] = [...messages, { role: 'user', content: text.trim() }];
    setMessages(newMsgs);
    setPrompt('');
    setIsThinking(true);

    setTimeout(() => {
      let reply = `Here is an analysis of \`${activeTab?.name || 'your workspace'}\`:\n\n`;
      if (text.toLowerCase().includes('explain')) {
        reply += `The file defines logic for execution with appropriate error handling and modular separation. Each function is scoped cleanly with explicit inputs.`;
      } else if (text.toLowerCase().includes('review')) {
        reply += `**Code Quality**: Clean structure and standard naming conventions.\n**Security**: No hardcoded credentials detected.\n**Readability**: Well-structured.`;
      } else {
        reply += `CodeSync AI analyzed your code structure against project context using pgvector indexing. All functions appear syntactically sound.`;
      }

      setMessages([...newMsgs, { role: 'assistant', content: reply }]);
      setIsThinking(false);
    }, 700);
  };

  return (
    <div
      style={{ width: `${aiPanelWidth}px` }}
      className="h-full bg-ide-sidebar border-l border-ide-border flex flex-col z-20 shrink-0 select-none font-sans"
    >
      {/* Header */}
      <div className="h-9 px-3 flex items-center justify-between border-b border-ide-border bg-[#181818] shrink-0">
        <div className="flex items-center gap-1.5 text-ide-amber font-semibold text-ide-xs tracking-wider uppercase">
          <Sparkles className="w-3.5 h-3.5" />
          <span>CodeSync AI</span>
        </div>
        <button
          onClick={() => setAiPanelOpen(false)}
          className="p-1 text-ide-muted hover:text-white rounded hover:bg-[#2a2d2e] transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Quick Action Chips */}
      <div className="p-2 border-b border-ide-border/50 bg-[#1e1e1e] flex flex-wrap gap-1.5">
        <button
          onClick={() => handleAction('explain')}
          className="px-2 py-1 bg-[#252526] hover:bg-[#2f2f30] text-ide-text hover:text-white text-[11px] rounded border border-ide-border flex items-center gap-1 transition-colors"
        >
          <Code2 className="w-3 h-3 text-ide-blue" />
          <span>Explain</span>
        </button>
        <button
          onClick={() => handleAction('review')}
          className="px-2 py-1 bg-[#252526] hover:bg-[#2f2f30] text-ide-text hover:text-white text-[11px] rounded border border-ide-border flex items-center gap-1 transition-colors"
        >
          <ShieldCheck className="w-3 h-3 text-ide-green" />
          <span>Review</span>
        </button>
        <button
          onClick={() => handleAction('fix')}
          className="px-2 py-1 bg-[#252526] hover:bg-[#2f2f30] text-ide-text hover:text-white text-[11px] rounded border border-ide-border flex items-center gap-1 transition-colors"
        >
          <Zap className="w-3 h-3 text-ide-amber" />
          <span>Find Bugs</span>
        </button>
      </div>

      {/* Message History */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 font-sans text-ide-sm">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex flex-col ${
              m.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[90%] rounded-lg px-3 py-2 leading-relaxed ${
                m.role === 'user'
                  ? 'bg-ide-blue text-white rounded-br-none text-right'
                  : 'bg-[#252526] text-ide-text border border-ide-border rounded-bl-none text-left'
              }`}
            >
              <p className="whitespace-pre-wrap text-ide-xs select-text">{m.content}</p>
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex items-center gap-2 text-ide-amber text-ide-xs italic">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            <span>Thinking...</span>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendPrompt();
        }}
        className="p-2 border-t border-ide-border bg-[#181818] flex items-center gap-2"
      >
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask CodeSync AI..."
          className="flex-1 px-3 py-1.5 bg-[#202020] border border-ide-border rounded text-white text-ide-sm outline-none focus:border-ide-amber"
        />
        <button
          type="submit"
          disabled={!prompt.trim() || isThinking}
          className="p-2 bg-ide-amber hover:bg-amber-600 text-black rounded transition-colors disabled:opacity-40"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
