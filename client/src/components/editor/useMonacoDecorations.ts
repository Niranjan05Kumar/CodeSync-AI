import { useEffect, useRef } from 'react';
import type { editor as MonacoEditorType } from 'monaco-editor';
import { Collaborator } from '../../types';

/**
 * Manages Monaco decorations for remote collaborators' cursors and text selections.
 * Implements remote cursor widget flags and highlights according to UI_DESIGN.md Section 4.4.
 */
export function useMonacoDecorations(
  editor: MonacoEditorType.IStandaloneCodeEditor | null,
  collaborators: Collaborator[],
  activeFileId: string | null
) {
  const decorationsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!editor || !activeFileId) return;

    // Filter collaborators currently in this file with valid cursor positions
    const activeInFile = collaborators.filter(
      (c) => c.cursorPosition && (!c.activeFileId || c.activeFileId === activeFileId)
    );

    const newDecorations: MonacoEditorType.IModelDeltaDecoration[] = [];

    activeInFile.forEach((c) => {
      if (!c.cursorPosition) return;
      const { lineNumber, column } = c.cursorPosition;

      // Color mapping class
      const colorName = getColorName(c.color);

      // Cursor caret line decoration
      newDecorations.push({
        range: {
          startLineNumber: lineNumber,
          startColumn: column,
          endLineNumber: lineNumber,
          endColumn: column
        },
        options: {
          className: `remote-cursor remote-cursor-${colorName}`,
          hoverMessage: { value: `**${c.username}** is editing here` },
          zIndex: 100
        }
      });
    });

    try {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
    } catch (err) {
      console.warn('[useMonacoDecorations] Failed to apply remote decorations:', err);
    }

    return () => {
      if (editor && decorationsRef.current.length > 0) {
        try {
          decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
        } catch {
          // Model might have been disposed
        }
      }
    };
  }, [editor, collaborators, activeFileId]);
}

function getColorName(hex: string): string {
  switch (hex.toLowerCase()) {
    case '#e5a93c': return 'amber';
    case '#4ec9b0': return 'emerald';
    case '#4fc1ff': return 'sky';
    case '#f14c4c': return 'rose';
    case '#c586c0': return 'purple';
    case '#ce9178': return 'orange';
    default: return 'sky';
  }
}
