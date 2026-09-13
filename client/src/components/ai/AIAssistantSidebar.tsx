import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  Code2, 
  ShieldCheck, 
  Bug, 
  MessageSquare, 
  Loader2, 
  RotateCcw,
  CheckCircle2,
  FileCode,
  AlertOctagon,
  Database,
  Search,
  RefreshCw
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useProjectStore } from '../../store/useProjectStore';
import { aiApi, ReviewResult, DebugResult, ChatMessage } from '../../api/aiApi';
import { ragApi, RAGQueryResult, RAGSyncResult } from '../../api/ragApi';
import { ReviewCard } from './ReviewCard';
import { RAGCitations } from './RAGCitations';

export const AIAssistantSidebar: React.FC = () => {
  const { isAiPanelOpen, setAiPanelOpen, aiPanelWidth } = useUIStore();
  const { 
    currentProject, 
    openTabs, 
    activeTabId, 
    activeFileContent, 
    updateActiveContent,
    openFileByPath,
    executionLogs 
  } = useProjectStore();

  const [activeTab, setActiveTab] = useState<'chat' | 'review' | 'debug' | 'rag'>('chat');

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hello! I am your CodeSync AI pair programmer. Ask me anything about your project, or select a quick action below.'
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const abortChatRef = useRef<(() => void) | null>(null);

  // Review State
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');

  // Debugger State
  const [debugErrorInput, setDebugErrorInput] = useState('');
  const [debugResult, setDebugResult] = useState<DebugResult | null>(null);
  const [isDebugging, setIsDebugging] = useState(false);
  const [debugApiError, setDebugApiError] = useState<string | null>(null);

  // Project RAG State
  const [ragQueryInput, setRagQueryInput] = useState('');
  const [ragResult, setRagResult] = useState<RAGQueryResult | null>(null);
  const [isSearchingRAG, setIsSearchingRAG] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [ragError, setRagError] = useState<string | null>(null);
  const [indexStats, setIndexStats] = useState<RAGSyncResult | null>(null);

  const currentTab = openTabs.find((t) => t.id === activeTabId);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  if (!isAiPanelOpen) return null;

  // ----------------------------------------------------
  // Chat Handlers
  // ----------------------------------------------------
  const handleSendChat = (customText?: string) => {
    const text = customText || inputPrompt;
    if (!text.trim() || isStreaming) return;

    const userMessage: ChatMessage = { role: 'user', content: text.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputPrompt('');
    setIsStreaming(true);

    const assistantIndex = updatedMessages.length;
    setMessages([...updatedMessages, { role: 'assistant', content: '' }]);

    const abortFn = aiApi.streamChat(
      {
        messages: updatedMessages,
        activeFile: currentTab ? {
          path: currentTab.path || currentTab.name,
          content: activeFileContent,
          language: currentTab.language || 'plaintext'
        } : undefined
      },
      (chunkText) => {
        setMessages((prev) => {
          const next = [...prev];
          if (next[assistantIndex]) {
            next[assistantIndex] = {
              ...next[assistantIndex],
              content: next[assistantIndex].content + chunkText
            };
          }
          return next;
        });
      },
      () => {
        setIsStreaming(false);
        abortChatRef.current = null;
      },
      (err) => {
        setIsStreaming(false);
        abortChatRef.current = null;
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `⚠️ Error generating response: ${err.message}` }
        ]);
      }
    );

    abortChatRef.current = abortFn;
  };

  const handleStopStreaming = () => {
    if (abortChatRef.current) {
      abortChatRef.current();
      abortChatRef.current = null;
      setIsStreaming(false);
    }
  };

  // ----------------------------------------------------
  // Code Review Handlers
  // ----------------------------------------------------
  const handleRunReview = async () => {
    if (!currentProject || !currentTab) {
      setReviewError('Please open a file in the editor to perform a review.');
      return;
    }

    setIsReviewing(true);
    setReviewError(null);

    try {
      const res = await aiApi.reviewCode({
        projectId: currentProject.id,
        filePath: currentTab.path || currentTab.name,
        code: activeFileContent,
        language: currentTab.language || 'plaintext'
      });

      setReviewResult(res);
    } catch (err: any) {
      setReviewError(err.message || 'Failed to complete code review');
    } finally {
      setIsReviewing(false);
    }
  };

  const handleApplyReviewFix = (suggestedFix: string) => {
    if (!suggestedFix) return;
    updateActiveContent(suggestedFix);
  };

  // ----------------------------------------------------
  // Debugger Handlers
  // ----------------------------------------------------
  const handlePasteLatestConsoleError = () => {
    const errorLogs = executionLogs.filter((l) => l.type === 'stderr' || l.type === 'error');
    if (errorLogs.length > 0) {
      const latest = errorLogs[errorLogs.length - 1].text;
      setDebugErrorInput(latest);
    } else {
      setDebugErrorInput('No error detected in current output logs.');
    }
  };

  const handleRunDebug = async () => {
    if (!activeFileContent) {
      setDebugApiError('No active file code available to debug.');
      return;
    }

    setIsDebugging(true);
    setDebugApiError(null);

    try {
      const res = await aiApi.debugCode({
        code: activeFileContent,
        errorMessage: debugErrorInput,
        language: currentTab?.language || 'plaintext'
      });

      setDebugResult(res);
    } catch (err: any) {
      setDebugApiError(err.message || 'Failed to analyze code error');
    } finally {
      setIsDebugging(false);
    }
  };

  // ----------------------------------------------------
  // Project RAG Handlers
  // ----------------------------------------------------
  const handleSyncVectors = async () => {
    if (!currentProject) {
      setRagError('Please select a project first.');
      return;
    }

    setIsIndexing(true);
    setRagError(null);

    try {
      const res = await ragApi.syncProjectVectors(currentProject.id);
      setIndexStats(res);
    } catch (err: any) {
      setRagError(err.message || 'Failed to index project vectors');
    } finally {
      setIsIndexing(false);
    }
  };

  const handleSearchRAG = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentProject) {
      setRagError('Please select a project first.');
      return;
    }
    if (!ragQueryInput.trim()) return;

    setIsSearchingRAG(true);
    setRagError(null);

    try {
      const res = await ragApi.queryRAG({
        projectId: currentProject.id,
        query: ragQueryInput.trim(),
        limit: 5,
        minSimilarity: 0.50
      });
      setRagResult(res);
    } catch (err: any) {
      setRagError(err.message || 'Failed to query project context');
    } finally {
      setIsSearchingRAG(false);
    }
  };

  const handleOpenCitation = async (filePath: string) => {
    await openFileByPath(filePath);
  };

  const filteredIssues = reviewResult?.issues.filter((issue) => {
    if (severityFilter === 'ALL') return true;
    return issue.severity.toUpperCase() === severityFilter;
  }) || [];

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
          title="Close AI Assistant"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="h-8 px-1 flex items-center border-b border-ide-border bg-[#1e1e1e] shrink-0 text-ide-xs select-none">
        <button
          onClick={() => setActiveTab('chat')}
          className={`h-full px-2.5 font-medium uppercase tracking-wider flex items-center gap-1 border-b-2 transition-colors ${
            activeTab === 'chat'
              ? 'border-ide-blue text-white font-semibold'
              : 'border-transparent text-ide-muted hover:text-white'
          }`}
        >
          <MessageSquare className="w-3 h-3" />
          <span>Chat</span>
        </button>
        <button
          onClick={() => setActiveTab('review')}
          className={`h-full px-2.5 font-medium uppercase tracking-wider flex items-center gap-1 border-b-2 transition-colors ${
            activeTab === 'review'
              ? 'border-ide-blue text-white font-semibold'
              : 'border-transparent text-ide-muted hover:text-white'
          }`}
        >
          <ShieldCheck className="w-3 h-3" />
          <span>Review</span>
          {reviewResult && reviewResult.issues.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-[#5a1d1d] text-[#f14c4c] text-[10px] rounded-full font-bold">
              {reviewResult.issues.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('debug')}
          className={`h-full px-2.5 font-medium uppercase tracking-wider flex items-center gap-1 border-b-2 transition-colors ${
            activeTab === 'debug'
              ? 'border-ide-blue text-white font-semibold'
              : 'border-transparent text-ide-muted hover:text-white'
          }`}
        >
          <Bug className="w-3 h-3" />
          <span>Debug</span>
        </button>
        <button
          onClick={() => setActiveTab('rag')}
          className={`h-full px-2.5 font-medium uppercase tracking-wider flex items-center gap-1 border-b-2 transition-colors ${
            activeTab === 'rag'
              ? 'border-ide-blue text-white font-semibold'
              : 'border-transparent text-ide-muted hover:text-white'
          }`}
        >
          <Database className="w-3 h-3 text-ide-cyan" />
          <span>RAG</span>
        </button>
      </div>

      {/* Active File Context Pill */}
      {currentTab && activeTab !== 'rag' && (
        <div className="px-3 py-1.5 bg-[#1b1b1c] border-b border-ide-border/60 flex items-center justify-between text-ide-xs text-ide-muted shrink-0">
          <div className="flex items-center gap-1.5 truncate">
            <FileCode className="w-3 h-3 text-ide-blue shrink-0" />
            <span className="truncate text-white font-medium">{currentTab.name}</span>
            <span className="text-[10px] text-ide-dim uppercase">({currentTab.language})</span>
          </div>
          <span className="text-[10px] text-ide-green flex items-center gap-1 shrink-0">
            <CheckCircle2 className="w-2.5 h-2.5" /> Context Synced
          </span>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 1: CHAT                                          */}
      {/* ==================================================== */}
      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col min-h-0 bg-[#1e1e1e]">
          <div className="p-2 border-b border-ide-border/40 bg-[#1e1e1e] flex flex-wrap gap-1.5 shrink-0">
            <button
              onClick={() => handleSendChat('Explain step-by-step how this active file works and its overall architecture.')}
              className="px-2 py-1 bg-[#252526] hover:bg-[#2f2f30] text-ide-text hover:text-white text-[11px] rounded border border-ide-border flex items-center gap-1 transition-colors"
            >
              <Code2 className="w-3 h-3 text-ide-blue" />
              <span>Explain File</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('review');
                handleRunReview();
              }}
              className="px-2 py-1 bg-[#252526] hover:bg-[#2f2f30] text-ide-text hover:text-white text-[11px] rounded border border-ide-border flex items-center gap-1 transition-colors"
            >
              <ShieldCheck className="w-3 h-3 text-ide-green" />
              <span>Audit Security</span>
            </button>
            <button
              onClick={() => handleSendChat('Suggest performance and memory optimizations for this code.')}
              className="px-2 py-1 bg-[#252526] hover:bg-[#2f2f30] text-ide-text hover:text-white text-[11px] rounded border border-ide-border flex items-center gap-1 transition-colors"
            >
              <Sparkles className="w-3 h-3 text-ide-amber" />
              <span>Optimize</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3.5 select-text">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[92%] rounded-lg p-2.5 text-ide-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-ide-blue text-white rounded-br-xs'
                      : 'bg-[#252526] text-ide-text border border-ide-border rounded-bl-xs'
                  }`}
                >
                  <div className="whitespace-pre-wrap font-sans text-xs">
                    {msg.content}
                    {isStreaming && index === messages.length - 1 && (
                      <span className="inline-block w-1.5 h-3 ml-1 bg-ide-blue animate-pulse align-middle" />
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>

          <div className="p-2 border-t border-ide-border bg-[#181818] shrink-0">
            {isStreaming && (
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] text-ide-amber flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Generating response...</span>
                </span>
                <button
                  onClick={handleStopStreaming}
                  className="px-2 py-0.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-ide-dim text-[10px] rounded transition-colors"
                >
                  Stop
                </button>
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChat();
              }}
              className="flex items-center gap-1.5"
            >
              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Ask about this code..."
                disabled={isStreaming}
                className="flex-1 px-3 py-1.5 bg-[#252526] border border-ide-border rounded text-white text-ide-xs outline-none focus:border-ide-blue disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputPrompt.trim() || isStreaming}
                className="p-1.5 bg-ide-blue hover:bg-ide-blueHover text-white rounded transition-colors disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: CODE REVIEW                                   */}
      {/* ==================================================== */}
      {activeTab === 'review' && (
        <div className="flex-1 flex flex-col min-h-0 bg-[#1e1e1e] p-3 space-y-3 overflow-y-auto">
          <div className="flex items-center justify-between gap-2 shrink-0">
            <button
              onClick={handleRunReview}
              disabled={isReviewing || !activeFileContent}
              className="flex-1 py-1.5 px-3 bg-ide-blue hover:bg-ide-blueHover disabled:opacity-50 text-white rounded font-medium text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              {isReviewing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Auditing Code...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Run Code Review</span>
                </>
              )}
            </button>
            {reviewResult && (
              <button
                onClick={handleRunReview}
                title="Rerun Review"
                className="p-1.5 bg-[#252526] hover:bg-[#2e2e2f] text-ide-muted hover:text-white border border-ide-border rounded transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {reviewError && (
            <div className="p-2.5 bg-[#4a1c1c] border border-ide-red/50 text-ide-red text-xs rounded">
              {reviewError}
            </div>
          )}

          {reviewResult && (
            <div className="space-y-3 select-text">
              <div className="p-2.5 bg-[#252526] border border-ide-border rounded text-xs space-y-1">
                <div className="font-semibold text-white">Review Summary</div>
                <p className="text-ide-dim leading-relaxed">{reviewResult.summary}</p>
              </div>

              <div className="flex items-center gap-1 flex-wrap text-[10px]">
                {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => {
                  const count = sev === 'ALL'
                    ? reviewResult.issues.length
                    : reviewResult.issues.filter((i) => i.severity.toUpperCase() === sev).length;

                  return (
                    <button
                      key={sev}
                      onClick={() => setSeverityFilter(sev)}
                      className={`px-2 py-0.5 rounded border transition-colors ${
                        severityFilter === sev
                          ? 'bg-ide-blue text-white border-ide-blue font-bold'
                          : 'bg-[#252526] text-ide-muted border-ide-border hover:text-white'
                      }`}
                    >
                      {sev} ({count})
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2">
                {filteredIssues.map((issue, idx) => (
                  <ReviewCard
                    key={idx}
                    issue={issue}
                    onApplyFix={handleApplyReviewFix}
                  />
                ))}

                {filteredIssues.length === 0 && (
                  <div className="py-6 text-center text-ide-muted text-xs">
                    <CheckCircle2 className="w-6 h-6 text-ide-green mx-auto mb-1.5" />
                    <span>No {severityFilter !== 'ALL' ? severityFilter.toLowerCase() : ''} issues detected.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {!reviewResult && !isReviewing && (
            <div className="py-12 text-center text-ide-muted text-xs space-y-2">
              <ShieldCheck className="w-10 h-10 text-ide-blue/60 mx-auto" />
              <p className="font-medium text-white">Automated Code Review</p>
              <p className="max-w-[240px] mx-auto leading-relaxed">
                Scan your active file for critical security vulnerabilities, logic bugs, performance leaks, and styling improvements.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: DEBUGGER                                      */}
      {/* ==================================================== */}
      {activeTab === 'debug' && (
        <div className="flex-1 flex flex-col min-h-0 bg-[#1e1e1e] p-3 space-y-3 overflow-y-auto">
          <div className="space-y-1.5 shrink-0">
            <div className="flex items-center justify-between text-xs text-ide-muted">
              <span className="font-medium text-white flex items-center gap-1">
                <AlertOctagon className="w-3.5 h-3.5 text-ide-red" />
                <span>Error / Exception Trace</span>
              </span>
              <button
                onClick={handlePasteLatestConsoleError}
                className="text-[10px] text-ide-blue hover:underline cursor-pointer"
              >
                Paste from Console
              </button>
            </div>
            <textarea
              value={debugErrorInput}
              onChange={(e) => setDebugErrorInput(e.target.value)}
              placeholder="Paste stack trace or error message (e.g. TypeError: 'NoneType' object is not subscriptable)..."
              rows={3}
              className="w-full p-2 bg-[#252526] border border-ide-border rounded text-white font-mono text-[11px] outline-none focus:border-ide-blue resize-none"
            />
          </div>

          <button
            onClick={handleRunDebug}
            disabled={isDebugging || !activeFileContent}
            className="w-full py-1.5 px-3 bg-ide-blue hover:bg-ide-blueHover disabled:opacity-50 text-white rounded font-medium text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm shrink-0"
          >
            {isDebugging ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Debugging Stack Trace...</span>
              </>
            ) : (
              <>
                <Bug className="w-3.5 h-3.5" />
                <span>Analyze & Fix Error</span>
              </>
            )}
          </button>

          {debugApiError && (
            <div className="p-2.5 bg-[#4a1c1c] border border-ide-red/50 text-ide-red text-xs rounded">
              {debugApiError}
            </div>
          )}

          {debugResult && (
            <div className="space-y-3 select-text text-xs">
              <div className="p-3 bg-[#252526] border-l-4 border-l-ide-red border border-ide-border rounded space-y-1">
                <div className="font-semibold text-ide-red uppercase text-[10px] tracking-wider">
                  Root Cause
                </div>
                <div className="font-medium text-white">{debugResult.rootCause}</div>
                <p className="text-ide-dim text-[11px] leading-relaxed pt-1">
                  {debugResult.explanation}
                </p>
              </div>

              {debugResult.steps && debugResult.steps.length > 0 && (
                <div className="p-2.5 bg-[#252526] border border-ide-border rounded space-y-1.5">
                  <div className="font-semibold text-white text-[11px]">Resolution Steps:</div>
                  <ul className="space-y-1 list-disc list-inside text-ide-dim text-[11px]">
                    {debugResult.steps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}

              {debugResult.fixedCode && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-ide-muted text-[11px]">
                    <span className="text-white font-medium flex items-center gap-1">
                      <Code2 className="w-3 h-3 text-ide-green" />
                      <span>Suggested Solution</span>
                    </span>
                  </div>

                  <pre className="p-2.5 bg-[#1b1b1c] border border-ide-border rounded font-mono text-[11px] text-ide-text overflow-x-auto whitespace-pre-wrap select-all">
                    {debugResult.fixedCode}
                  </pre>
                </div>
              )}
            </div>
          )}

          {!debugResult && !isDebugging && (
            <div className="py-12 text-center text-ide-muted text-xs space-y-2">
              <Bug className="w-10 h-10 text-ide-red/60 mx-auto" />
              <p className="font-medium text-white">AI Error Debugger</p>
              <p className="max-w-[240px] mx-auto leading-relaxed">
                Paste any runtime exception or stack trace from execution output to diagnose root causes and get 1-click patches.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 4: PROJECT RAG (pgvector Search)                */}
      {/* ==================================================== */}
      {activeTab === 'rag' && (
        <div className="flex-1 flex flex-col min-h-0 bg-[#1e1e1e] p-3 space-y-3 overflow-y-auto">
          {/* Indexing Status & Sync Banner */}
          <div className="p-2.5 bg-[#252526] border border-ide-border rounded text-xs space-y-2 shrink-0">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-ide-cyan" />
                <span>pgvector HNSW Index</span>
              </span>
              <button
                onClick={handleSyncVectors}
                disabled={isIndexing || !currentProject}
                className="px-2 py-1 bg-ide-elevated hover:bg-[#2d2d2d] border border-ide-border rounded text-[11px] text-ide-text hover:text-white flex items-center gap-1 transition-colors disabled:opacity-50"
                title="Index/Re-index Project Files"
              >
                {isIndexing ? (
                  <Loader2 className="w-3 h-3 animate-spin text-ide-blue" />
                ) : (
                  <RefreshCw className="w-3 h-3 text-ide-blue" />
                )}
                <span>{isIndexing ? 'Indexing...' : 'Index Project'}</span>
              </button>
            </div>

            <p className="text-ide-dim text-[11px] leading-relaxed">
              {indexStats
                ? `Successfully indexed ${indexStats.indexedFiles} files into ${indexStats.totalChunks} vector chunks.`
                : 'Index all source files into PostgreSQL pgvector to enable sub-10ms semantic code search and grounded answers.'}
            </p>
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearchRAG} className="space-y-2 shrink-0">
            <div className="relative">
              <input
                type="text"
                value={ragQueryInput}
                onChange={(e) => setRagQueryInput(e.target.value)}
                placeholder="Ask about architecture, functions, database pools..."
                disabled={isSearchingRAG || !currentProject}
                className="w-full pl-8 pr-3 py-1.5 bg-[#252526] border border-ide-border rounded text-white text-xs outline-none focus:border-ide-blue placeholder:text-ide-muted"
              />
              <Search className="w-3.5 h-3.5 text-ide-muted absolute left-2.5 top-2.5" />
            </div>

            <button
              type="submit"
              disabled={isSearchingRAG || !ragQueryInput.trim() || !currentProject}
              className="w-full py-1.5 px-3 bg-ide-blue hover:bg-ide-blueHover disabled:opacity-50 text-white rounded font-medium text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              {isSearchingRAG ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Searching Codebase...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Query Project Knowledge</span>
                </>
              )}
            </button>
          </form>

          {ragError && (
            <div className="p-2.5 bg-[#4a1c1c] border border-ide-red/50 text-ide-red text-xs rounded">
              {ragError}
            </div>
          )}

          {/* RAG Answer & Citations */}
          {ragResult && (
            <div className="space-y-3 select-text text-xs">
              {/* Answer Card */}
              <div className="p-3 bg-[#252526] border border-ide-border rounded space-y-1.5">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-ide-amber" />
                  <span>Grounded Answer</span>
                </div>
                <div className="text-ide-text text-[11px] leading-relaxed whitespace-pre-wrap">
                  {ragResult.answer}
                </div>
              </div>

              {/* Citations Accordion */}
              <RAGCitations
                sources={ragResult.citedSources}
                onOpenCitation={handleOpenCitation}
              />
            </div>
          )}

          {!ragResult && !isSearchingRAG && (
            <div className="py-10 text-center text-ide-muted text-xs space-y-2">
              <Database className="w-10 h-10 text-ide-cyan/60 mx-auto" />
              <p className="font-medium text-white">Project-Aware RAG</p>
              <p className="max-w-[240px] mx-auto leading-relaxed">
                Queries are embedded into vectors and matched against your entire codebase using PostgreSQL HNSW cosine similarity.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
