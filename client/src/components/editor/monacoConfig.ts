import type { editor } from 'monaco-editor';

/**
 * VS Code Dark Modern Editor Configuration Preset
 * Strict adherence to Section 4.4 of UI_DESIGN.md
 */
export const DEFAULT_MONACO_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  theme: 'vs-dark',
  fontFamily: '"JetBrains Mono", "Fira Code", monospace',
  fontSize: 14,
  lineHeight: 21,
  cursorBlinking: 'smooth',
  cursorSmoothCaretAnimation: 'on',
  smoothScrolling: true,
  minimap: { enabled: true, maxColumn: 80, scale: 1 },
  scrollBeyondLastLine: false,
  automaticLayout: true,
  bracketPairColorization: { enabled: true },
  renderLineHighlight: 'all',
  lineNumbersMinChars: 4,
  padding: { top: 8, bottom: 8 },
  fixedOverflowWidgets: true,
  tabSize: 2,
  insertSpaces: true,
  wordWrap: 'off'
};

/**
 * Maps filename extension to Monaco Editor language identifiers
 */
export function getMonacoLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
      return 'typescript';
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'jsx':
      return 'javascript';
    case 'py':
      return 'python';
    case 'cpp':
    case 'cxx':
    case 'cc':
    case 'c':
    case 'h':
    case 'hpp':
      return 'cpp';
    case 'json':
      return 'json';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
      return 'css';
    case 'scss':
    case 'less':
      return 'css';
    case 'sql':
      return 'sql';
    case 'sh':
    case 'bash':
      return 'shell';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'xml':
    case 'svg':
      return 'xml';
    case 'dockerfile':
      return 'dockerfile';
    default:
      if (filename.toLowerCase() === 'dockerfile') return 'dockerfile';
      return 'plaintext';
  }
}

/**
 * Friendly display name for StatusBar
 */
export function getLanguageDisplayName(monacoLang: string): string {
  const map: Record<string, string> = {
    typescript: 'TypeScript',
    javascript: 'JavaScript',
    python: 'Python',
    cpp: 'C++',
    json: 'JSON',
    markdown: 'Markdown',
    html: 'HTML',
    css: 'CSS',
    sql: 'SQL',
    shell: 'Shell Script',
    yaml: 'YAML',
    xml: 'XML',
    dockerfile: 'Dockerfile',
    plaintext: 'Plain Text'
  };
  return map[monacoLang] || monacoLang.toUpperCase();
}

/**
 * Curated accessible colors for real-time collaborator presence
 * Per Section 2.2 of UI_DESIGN.md
 */
export const COLLABORATOR_PALETTE = [
  { name: 'Amber',   border: '#e5a93c', bg: 'rgba(229, 169, 60, 0.20)', text: '#ffffff' },
  { name: 'Emerald', border: '#4ec9b0', bg: 'rgba(78, 201, 176, 0.20)', text: '#ffffff' },
  { name: 'Sky',     border: '#4fc1ff', bg: 'rgba(79, 193, 255, 0.20)', text: '#ffffff' },
  { name: 'Rose',    border: '#f14c4c', bg: 'rgba(241, 76, 76, 0.20)',   text: '#ffffff' },
  { name: 'Purple',  border: '#c586c0', bg: 'rgba(197, 134, 192, 0.20)', text: '#ffffff' },
  { name: 'Orange',  border: '#ce9178', bg: 'rgba(206, 145, 120, 0.20)', text: '#ffffff' }
];

export function getCollaboratorColor(index: number) {
  return COLLABORATOR_PALETTE[index % COLLABORATOR_PALETTE.length];
}
