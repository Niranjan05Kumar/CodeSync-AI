import React, { useRef, useState, useCallback, useEffect } from 'react';
import Editor, { OnMount, BeforeMount } from '@monaco-editor/react';
import type { editor as MonacoEditorType } from 'monaco-editor';
import { Code2, Command, FileText, FolderPlus, Terminal, Loader2 } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { useUIStore } from '../../store/useUIStore';
import { EditorTabs } from './EditorTabs';
import { Breadcrumbs } from './Breadcrumbs';
import { DEFAULT_MONACO_OPTIONS, getMonacoLanguage } from './monacoConfig';
import { useMonacoDecorations } from './useMonacoDecorations';

export const EditorArea: React.FC = () => {
  const { 
    openTabs, 
    activeTabId, 
    activeFileContent, 
    updateActiveContent, 
    saveActiveFile,
    collaborators 
  } = useProjectStore();

  const { setQuickOpenOpen, setCreateProjectOpen, setCursorPosition } = useUIStore();

  const [editorInstance, setEditorInstance] = useState<MonacoEditorType.IStandaloneCodeEditor | null>(null);
  const debounceSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeTab = openTabs.find((t) => t.id === activeTabId);

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

    // Track active cursor position for Status Bar
    editor.onDidChangeCursorPosition((e) => {
      setCursorPosition({
        lineNumber: e.position.lineNumber,
        column: e.position.column
      });
    });

    // Register Ctrl+S / Cmd+S save hotkey
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (debounceSaveTimerRef.current) {
        clearTimeout(debounceSaveTimerRef.current);
      }
      saveActiveFile();
    });

    // Set focus to the editor
    editor.focus();
  };

  // Handle changes with 1.5s debounced database persistence
  const handleEditorChange = useCallback((value: string | undefined) => {
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
