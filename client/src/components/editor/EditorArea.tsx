import React, { useRef, useState, useCallback, useEffect } from 'react';
import Editor, { OnMount, BeforeMount } from '@monaco-editor/react';
import type { editor as MonacoEditorType } from 'monaco-editor';
import { Code2, Command, FileText, FolderPlus, Terminal, Loader2 } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { useUIStore } from '../../store/useUIStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useSocketActions } from '../../hooks/useSocketSync';
import { getSocket } from '../../sockets/socketClient';
import { EditorTabs } from './EditorTabs';
import { Breadcrumbs } from './Breadcrumbs';
import { DEFAULT_MONACO_OPTIONS, getMonacoLanguage } from './monacoConfig';
import { useMonacoDecorations } from './useMonacoDecorations';
import { MonacoChange } from '../../types';

export const EditorArea: React.FC = () => {
  const { 
    openTabs, 
    activeTabId, 
    activeFileContent, 
    activeFileVersion,
    updateActiveContent, 
    saveActiveFile,
    collaborators 
  } = useProjectStore();

  const { user } = useAuthStore();
  const { setQuickOpenOpen, setCreateProjectOpen, setCursorPosition } = useUIStore();
  const { broadcastCursorMove, broadcastDeltaChange } = useSocketActions();

  const [editorInstance, setEditorInstance] = useState<MonacoEditorType.IStandaloneCodeEditor | null>(null);
  const debounceSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isApplyingRemoteRef = useRef(false);
  const isProgrammaticUpdateRef = useRef(true);

  const activeTab = openTabs.find((t) => t.id === activeTabId);

  // Whenever activeTabId changes (file load / tab switch), mark as programmatic update
  useEffect(() => {
    isProgrammaticUpdateRef.current = true;
    const timer = setTimeout(() => {
      isProgrammaticUpdateRef.current = false;
    }, 200);
    return () => clearTimeout(timer);
  }, [activeTabId]);

  // Apply remote collaborator cursor decorations
  useMonacoDecorations(editorInstance, collaborators, activeTabId);

  // Setup custom VS Code Dark Modern theme tokens
  const handleBeforeMount: BeforeMount = (monaco) => {
    monaco.editor.defineTheme('codesync-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: '569CD6' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'type', foreground: '4EC9B0' },
        { token: 'function', foreground: 'DCDCAA' }
      ],
      colors: {
        'editor.background': '#1f1f1f',
        'editor.foreground': '#d4d4d4',
        'editor.lineHighlightBackground': '#282828',
        'editorLineNumber.foreground': '#858585',
        'editorLineNumber.activeForeground': '#c6c6c6',
        'editorCursor.foreground': '#007acc',
        'editor.selectionBackground': '#264f78',
        'editor.inactiveSelectionBackground': '#3a3d41',
        'editorGutter.background': '#1f1f1f',
        'editorBracketMatch.background': '#0064001a',
        'editorBracketMatch.border': '#888888',
        'editorOverviewRuler.border': '#2b2b2b'
      }
    });
  };

  const handleEditorMount: OnMount = (editor, monaco) => {
    setEditorInstance(editor);

    // 1. Track local cursor position & broadcast to peers
    editor.onDidChangeCursorPosition((e) => {
      const pos = {
        lineNumber: e.position.lineNumber,
        column: e.position.column
      };
      setCursorPosition(pos);

      if (activeTab) {
        broadcastCursorMove(activeTab.id, pos);
      }
    });

    // 2. Broadcast local delta changes on model content change
    editor.onDidChangeModelContent((event) => {
      // Never broadcast if changes were applied from a remote peer (prevent echo loop)
      if (isApplyingRemoteRef.current) return;

      // Never broadcast if changes are from programmatic model loading / tab switching
      if (isProgrammaticUpdateRef.current) return;

      // Never broadcast full buffer flushes (model.setValue)
      if (event.isFlush) return;

      // CRITICAL: Only broadcast if the user is actively focused and typing in this editor instance.
      // This strictly prevents initial file loads or background tab mounts from broadcasting the entire file.
      if (!editor.hasTextFocus() && !editor.hasWidgetFocus()) return;

      if (activeTab && event.changes && event.changes.length > 0) {
        const monacoChanges: MonacoChange[] = event.changes.map((c) => ({
          range: {
            startLineNumber: c.range.startLineNumber,
            startColumn: c.range.startColumn,
            endLineNumber: c.range.endLineNumber,
            endColumn: c.range.endColumn
          },
          rangeOffset: c.rangeOffset,
          rangeLength: c.rangeLength,
          text: c.text
        }));

        broadcastDeltaChange(activeTab.id, monacoChanges, activeFileVersion);
      }
    });

    // 3. Register Ctrl+S / Cmd+S save hotkey
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (debounceSaveTimerRef.current) {
        clearTimeout(debounceSaveTimerRef.current);
      }
      saveActiveFile();
    });

    // Set focus to the editor
    editor.focus();
  };

  // Listen for remote editor deltas from Socket.IO
  useEffect(() => {
    const socket = getSocket();

    const handleRemoteChange = (data: {
      fileId: string;
      changes: MonacoChange[];
      senderId: string;
      version: number;
    }) => {
      // Ignore if sent by self
      if (data.senderId === user?.id) return;
      if (!editorInstance) return;

      // Only apply if currently viewing the affected file
      if (data.fileId === activeTabId) {
        const model = editorInstance.getModel();
        if (!model) return;

        isApplyingRemoteRef.current = true;
        try {
          const edits = data.changes.map((c) => ({
            range: {
              startLineNumber: c.range.startLineNumber,
              startColumn: c.range.startColumn,
              endLineNumber: c.range.endLineNumber,
              endColumn: c.range.endColumn
            },
            text: c.text,
            forceMoveMarkers: true
          }));

          // CRITICAL: model.applyEdits() preserves local cursor and undo stack
          model.applyEdits(edits);

          // Update store content quietly
          updateActiveContent(model.getValue());
        } catch (err) {
          console.warn('[EditorArea] Failed to apply remote edits:', err);
        } finally {
          // Delay resetting remote flag slightly to let React re-render complete safely
          setTimeout(() => {
            isApplyingRemoteRef.current = false;
          }, 50);
        }
      }
    };

    socket.on('editor:change', handleRemoteChange);

    return () => {
      socket.off('editor:change', handleRemoteChange);
    };
  }, [editorInstance, activeTabId, user?.id, updateActiveContent]);

  // Handle local typing with 1.5s debounced database persistence
  const handleEditorChange = useCallback((value: string | undefined) => {
    if (isApplyingRemoteRef.current || isProgrammaticUpdateRef.current) return;

    const text = value ?? '';
    updateActiveContent(text);

    // Debounce save (1.5 seconds per AGENTS.md 3.1)
    if (debounceSaveTimerRef.current) {
      clearTimeout(debounceSaveTimerRef.current);
    }
    debounceSaveTimerRef.current = setTimeout(() => {
      saveActiveFile();
    }, 1500);
  }, [updateActiveContent, saveActiveFile]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceSaveTimerRef.current) {
        clearTimeout(debounceSaveTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1f1f1f] overflow-hidden">
      {/* Tab Strip */}
      <EditorTabs />

      {/* Breadcrumb Trail */}
      <Breadcrumbs />

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab ? (
          <Editor
            height="100%"
            width="100%"
            theme="codesync-dark"
            path={activeTab.id}
            language={getMonacoLanguage(activeTab.name)}
            value={activeFileContent}
            options={DEFAULT_MONACO_OPTIONS}
            beforeMount={handleBeforeMount}
            onMount={handleEditorMount}
            onChange={handleEditorChange}
            loading={
              <div className="h-full w-full flex items-center justify-center bg-[#1f1f1f] text-ide-muted text-ide-sm gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-ide-blue" />
                <span>Initializing editor engine...</span>
              </div>
            }
          />
        ) : (
          /* Empty / Welcome State */
          <div className="h-full flex flex-col items-center justify-center p-8 select-none bg-[#1f1f1f]">
            <div className="w-16 h-16 rounded-2xl bg-[#252526] border border-ide-border flex items-center justify-center text-ide-blue mb-4 shadow-xl">
              <Code2 className="w-8 h-8" />
            </div>

            <h1 className="text-xl font-semibold text-white mb-2">
              CodeSync AI
            </h1>
            <p className="text-ide-muted text-ide-sm mb-8 text-center max-w-md">
              Real-time collaborative cloud IDE powered by Monaco, sandboxed Docker execution, and project-aware AI.
            </p>

            {/* Shortcuts Grid */}
            <div className="w-full max-w-sm space-y-2 text-ide-sm">
              <div
                onClick={() => setQuickOpenOpen(true)}
                className="flex items-center justify-between p-2 rounded hover:bg-[#252526] cursor-pointer text-ide-text hover:text-white transition-colors border border-transparent hover:border-ide-border"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-ide-blue" />
                  <span>Go to File</span>
                </div>
                <kbd className="px-1.5 py-0.5 bg-[#2a2d2e] border border-ide-border rounded text-xs text-ide-dim">
                  Ctrl + P
                </kbd>
              </div>

              <div
                onClick={() => setCreateProjectOpen(true)}
                className="flex items-center justify-between p-2 rounded hover:bg-[#252526] cursor-pointer text-ide-text hover:text-white transition-colors border border-transparent hover:border-ide-border"
              >
                <div className="flex items-center gap-2">
                  <FolderPlus className="w-4 h-4 text-ide-blue" />
                  <span>New Project</span>
                </div>
                <span className="text-xs text-ide-dim">Create</span>
              </div>

              <div className="flex items-center justify-between p-2 text-ide-text">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-ide-dim" />
                  <span className="text-ide-dim">Toggle Terminal</span>
                </div>
                <kbd className="px-1.5 py-0.5 bg-[#2a2d2e] border border-ide-border rounded text-xs text-ide-dim">
                  Ctrl + J
                </kbd>
              </div>

              <div className="flex items-center justify-between p-2 text-ide-text">
                <div className="flex items-center gap-2">
                  <Command className="w-4 h-4 text-ide-dim" />
                  <span className="text-ide-dim">Toggle Primary Sidebar</span>
                </div>
                <kbd className="px-1.5 py-0.5 bg-[#2a2d2e] border border-ide-border rounded text-xs text-ide-dim">
                  Ctrl + B
                </kbd>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
