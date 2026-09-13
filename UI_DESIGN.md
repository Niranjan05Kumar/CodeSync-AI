# UI/UX Design Specification: Modern Cloud IDE
## AI-Powered Real-Time Collaborative Code Editor
**Aesthetic Style**: Professional VS Code Dark Modern | Developer-First | Information-Dense & Distraction-Free  
**Design Philosophy**: "Function over decoration" — zero marketing fluff, no excessive glassmorphism, no neon gradients. Every pixel serves the coding, collaboration, and AI pair-programming workflow.

---

## 1. Design Vision & Guiding Principles

1. **True IDE Experience**: Emulate the ergonomics, layout density, and keyboard responsiveness of modern VS Code. The code editor is the hero element; surrounding panels are subordinate and collapsible.
2. **Subtle Depth & Layering**: Create visual separation using **5 distinct dark surface tones** and 1px subtle borders (`#2b2b2b`), rather than drop-shadows or high-contrast borders.
3. **Restrained Functional Color**: Use **VS Code Blue (`#007acc` / `#0e639c`)** strictly for focus, primary CTA (Run), active tabs, and selection indicators. Status colors (green, amber, red) are desaturated and purposeful.
4. **Collaborator Visual Clarity**: Multi-user cursors and presence avatars use an accessible, distinct 6-color palette that never clashes with code syntax highlighting.
5. **Seamless AI & RAG Integration**: AI assistance and vector-retrieved project context feel like native IDE inspection panels, not disconnected chat popups.

---

## 2. Design Tokens & Tailwind CSS Configuration

### 2.1 Color Palette & Surface Hierarchy

```
┌────────────────────────┬──────────┬─────────────────────────────────────────────┐
│ Token Name             │ Hex Code │ UI Application                              │
├────────────────────────┼──────────┼─────────────────────────────────────────────┤
│ bg-ide-activity        │ #181818  │ Activity Bar (Far left, darkest surface)    │
│ bg-ide-sidebar         │ #1e1e1e  │ File Explorer, AI Sidebar, Settings         │
│ bg-ide-editor          │ #1f1f1f  │ Monaco Editor canvas                        │
│ bg-ide-tabs            │ #181818  │ Editor tab container header                 │
│ bg-ide-tab-active      │ #1f1f1f  │ Currently active editor tab (blends with ed)│
│ bg-ide-tab-inactive    │ #181818  │ Background tabs                             │
│ bg-ide-panel           │ #181818  │ Bottom panel (Terminal, Output, Chat)       │
│ bg-ide-status          │ #007acc  │ Status bar background (or #181818 dark mode)│
│ bg-ide-elevated        │ #252526  │ Context menus, Quick Open, Command Palette  │
│ border-ide-subtle      │ #2b2b2b  │ 1px dividers between panels and tabs        │
│ border-ide-focus       │ #007acc  │ Focused input ring, active tab top-border   │
│ text-ide-primary       │ #cccccc  │ Code, filenames, primary text               │
│ text-ide-muted         │ #858585  │ Line numbers, secondary metadata, shortcuts │
│ text-ide-dim           │ #5a5a5a  │ Inactive icons, disabled items              │
│ accent-ide-blue        │ #007acc  │ Primary buttons, active markers, hyperlinks │
│ accent-ide-blue-hover  │ #0e639c  │ Button hover state                          │
│ status-ide-green       │ #4ec9b0  │ Success, connected, online presence         │
│ status-ide-amber       │ #cca700  │ Warnings, unsaved changes bullet, indexing  │
│ status-ide-red         │ #f14c4c  │ Runtime errors, failed execution, deleted   │
└────────────────────────┴──────────┴─────────────────────────────────────────────┘
```

### 2.2 Multi-User Collaborator Palette
Curated accessible colors for real-time cursor presence, selection highlights, and user tags:
```typescript
export const COLLABORATOR_PALETTE = [
  { name: 'Amber',   border: '#e5a93c', bg: 'rgba(229, 169, 60, 0.20)', text: '#ffffff' },
  { name: 'Emerald', border: '#4ec9b0', bg: 'rgba(78, 201, 176, 0.20)', text: '#ffffff' },
  { name: 'Sky',     border: '#4fc1ff', bg: 'rgba(79, 193, 255, 0.20)', text: '#ffffff' },
  { name: 'Rose',    border: '#f14c4c', bg: 'rgba(241, 76, 76, 0.20)',   text: '#ffffff' },
  { name: 'Purple',  border: '#c586c0', bg: 'rgba(197, 134, 192, 0.20)', text: '#ffffff' },
  { name: 'Orange',  border: '#ce9178', bg: 'rgba(206, 145, 120, 0.20)', text: '#ffffff' },
];
```

### 2.3 Typography Specs
* **UI Sans Font**: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
  * Body: `12px` (standard IDE text), `line-height: 16px`
  * Header/Labels: `11px` uppercase tracking-wider (`font-medium`)
  * Titles: `13px font-semibold`
* **Code Monospace Font**: `"JetBrains Mono", "Fira Code", Menlo, Monaco, "Courier New", monospace`
  * Editor: `14px`, `line-height: 21px`, ligatures enabled (`font-variant-ligatures: normal`)
  * Terminal/Console: `12px`, `line-height: 18px`

### 2.4 Tailwind Configuration Extension (`tailwind.config.js`)
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ide: {
          activity: '#181818',
          sidebar: '#1e1e1e',
          editor: '#1f1f1f',
          tabs: '#181818',
          tabActive: '#1f1f1f',
          panel: '#181818',
          status: '#007acc',
          elevated: '#252526',
          border: '#2b2b2b',
          focus: '#007acc',
          text: '#cccccc',
          muted: '#858585',
          dim: '#5a5a5a',
          blue: '#007acc',
          blueHover: '#0e639c',
          green: '#4ec9b0',
          amber: '#cca700',
          red: '#f14c4c'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace']
      },
      fontSize: {
        'ide-xs': ['10px', '14px'],
        'ide-sm': ['11px', '15px'],
        'ide-base': ['12px', '16px'],
        'ide-md': ['13px', '18px'],
        'ide-code': ['14px', '21px'],
      }
    }
  },
  plugins: []
};
```

---

## 3. Global Layout Grid & Pixel Geometry

The IDE viewport is fixed to `100vh` and `100vw` without browser scrollbars. Panels use resizable split handles (`min` and `max` constraints).

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TOP APPLICATION BAR (h-10 / 40px)                                                      │
├────┬──────────────────┬────────────────────────────────────────┬───────────────────────┤
│    │                  │ TABS BAR (h-9 / 36px)                  │ AI ASSISTANT PANEL    │
│ A  │ EXPLORER SIDEBAR ├────────────────────────────────────────┤ (w-80 / 320px)        │
│ C  │ (w-64 / 256px)   │ BREADCRUMBS BAR (h-6 / 24px)           │ Resizable [260-480px] │
│ T  │ Resizable        ├────────────────────────────────────────┤                       │
│ I  │ [180-450px]      │                                        │ • Quick Action Pills  │
│ V  │                  │                                        │ • Context Chips       │
│ I  │ • Project Title  │          MONACO EDITOR                 │ • Chat Stream Panel   │
│ T  │ • File Tree      │             (flex-1)                   │ • RAG Context Drawer  │
│ Y  │ • Context Actions│                                        │ • Prompt Input Bar    │
│    │                  │                                        │                       │
│ B  │                  │                                        │                       │
│ A  │                  ├────────────────────────────────────────┴───────────────────────┤
│ R  │                  │ RESIZABLE SPLIT HANDLE (h-1 / hover:bg-ide-focus)              │
│    │                  ├────────────────────────────────────────────────────────────────┤
│ 48 │                  │ BOTTOM DOCK PANEL (h-56 / 224px, resizable [120-600px])        │
│ px │                  │ Tabs: TERMINAL | OUTPUT | PROBLEMS | CHAT                     │
├────┴──────────────────┴────────────────────────────────────────────────────────────────┤
│ STATUS BAR (h-6 / 24px)                                                                │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Component Deep Dives & Visual Specifications

### 4.1 Activity Bar (Far Left, 48px Width)
* **Visual Specs**: `w-12 bg-ide-activity border-r border-ide-border flex flex-col justify-between items-center py-2`.
* **Top Icon Stack**:
  1. **Explorer Icon** (`Files` / `FolderTree` Lucide icon) — Hotkey `Ctrl/Cmd + Shift + E`.
  2. **Search / Quick Open** (`Search` icon) — Hotkey `Ctrl/Cmd + Shift + F`.
  3. **Run & Debug** (`Play` / `Terminal` icon) — Hotkey `Ctrl/Cmd + Shift + D`.
  4. **AI Assistant** (`Sparkles` / `Bot` icon) — Hotkey `Ctrl/Cmd + Shift + A`.
* **Bottom Icon Stack**:
  1. **Collaborators List** (`Users` icon with badge count `● 3`).
  2. **User Profile / Settings** (`Settings` / `User` avatar).
* **State Styling**:
  * Inactive Icon: `text-ide-dim hover:text-ide-text transition-colors p-2.5`.
  * Active Tab: `text-white relative before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:bg-ide-blue`.

---

### 4.2 Explorer Sidebar (Width: 256px Default, Resizable)
* **Visual Specs**: `bg-ide-sidebar border-r border-ide-border flex flex-col select-none text-ide-text text-ide-base`.
* **Header Area (`h-9 px-3 flex items-center justify-between`)**:
  * Title: `EXPLORER` in `text-ide-sm font-semibold tracking-wider text-ide-muted`.
  * Action Buttons (Ghost Icons):
    * `New File` (`FilePlus` icon)
    * `New Folder` (`FolderPlus` icon)
    * `Refresh Tree` (`RefreshCw` icon)
    * `Collapse All` (`FolderMinus` icon)
* **File Tree Hierarchy**:
  * Folder Row: Chevron `ChevronRight` (collapsed) or `ChevronDown` (expanded), folder icon, folder name. Indentation = `level * 12px`.
  * File Row: File-type icon (colored according to extension: `.ts` blue, `.tsx` cyan, `.py` yellow, `.json` amber, `.css` sky), file name.
  * Active File Row: `bg-[#2a2d2e] text-white`.
  * Hover Row: `hover:bg-[#252526]`.
* **Inline Creation Mode**:
  * When clicking "New File", inserts an input element with `h-6 px-1 bg-ide-activity border border-ide-focus text-ide-text text-ide-base outline-none`. Pressing `Enter` commits; `Esc` cancels.
* **Context Menu (Right Click)**:
  * Dropdown in `bg-ide-elevated border border-ide-border shadow-xl rounded-none py-1 w-48 text-ide-base`:
    * `Rename` (F2)
    * `Delete` (Delete)
    * `Copy Relative Path`
    * `Download File`

---

### 4.3 Top Bar (Height: 40px)
* **Visual Specs**: `h-10 bg-ide-sidebar border-b border-ide-border px-3 flex items-center justify-between text-ide-base`.
* **Left Cluster (Project Info & Quick Search)**:
  * App Icon / Brand: Subtle logo glyph (`Code2` in `#007acc`).
  * Project Name Dropdown: `Distributed-Raft-Cluster` in `font-medium text-white hover:bg-ide-elevated px-2 py-1 rounded cursor-pointer`.
  * Quick Open Search Bar (`w-64 h-6 px-2 bg-ide-activity border border-ide-border rounded flex items-center text-ide-muted hover:border-ide-focus cursor-pointer`):
    * Shows `Search files (Ctrl + P)` with magnifying glass icon.
* **Center Cluster (Main Controls)**:
  * **Run Button (Primary Action)**:
    * Idle State: `h-7 px-3 bg-ide-blue hover:bg-ide-blueHover text-white font-medium flex items-center gap-1.5 rounded transition-colors text-ide-sm`.
    * Running State: `h-7 px-3 bg-[#333333] text-ide-muted flex items-center gap-1.5 cursor-not-allowed text-ide-sm` with a spinning loader.
* **Right Cluster (Real-Time Collaborators & AI)**:
  * **Presence Avatars Group**:
    * Overlapping circles (`w-6 h-6 rounded-full border-2 border-ide-sidebar flex items-center justify-center text-ide-xs font-bold text-white`).
    * Each avatar colored according to collaborator palette with tooltip showing: *"Rahul Sharma (Editing auth.ts)"*.
  * **Share / Invite Button**: `h-7 px-2.5 bg-ide-elevated hover:bg-[#333333] text-ide-text border border-ide-border rounded flex items-center gap-1 text-ide-sm`.
  * **AI Assistant Toggle**: `h-7 px-2.5 bg-ide-elevated hover:bg-[#333333] text-ide-text border border-ide-border rounded flex items-center gap-1 text-ide-sm`.

---

### 4.4 Monaco Editor Area (Primary Hero Surface)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TABS BAR: [ src/main.py   × ] [ src/auth.py ● × ] [ README.md × ]         [Split] [⋯] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ BREADCRUMBS: src  >  components  >  AuthModal.tsx  >  handleSubmit()                   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  1 │ import { useState, useEffect } from 'react';                                      │
│  2 │                                                                                   │
│  3 │ export function AuthModal({ isOpen, onClose }: AuthModalProps) {                  │
│  4 │   const [email, setEmail] = useState('');                                         │
│  5 │   const [password, setPassword] = useState('');│Rahul (Sky cursor)               │
│  6 │   const [isLoading, setIsLoading] = useState(false);                              │
│  7 │                                                                                   │
│  8 │   async function handleSubmit(e: React.FormEvent) {                               │
│  9 │     e.preventDefault();                                                           │
│ 10 │     setIsLoading(true);                                                           │
│ 11 │     try {                                                                         │
│ 12 │       await authService.login(email, password);                                   │
│    │                                                                                   │
│    │                                                                                   │
└────┴───────────────────────────────────────────────────────────────────────────────────┘
```

#### Editor Tabs Bar (`h-9 bg-ide-tabs flex items-center border-b border-ide-border overflow-x-auto`):
* **Active Tab**: `bg-ide-tabActive text-white border-t-2 border-ide-focus border-r border-ide-border px-3 h-full flex items-center gap-2 cursor-pointer text-ide-base`.
* **Inactive Tab**: `bg-ide-tabInactive text-ide-muted hover:bg-[#1f1f1f] hover:text-ide-text border-r border-ide-border px-3 h-full flex items-center gap-2 cursor-pointer text-ide-base`.
* **Unsaved Indicator**: Replaces the close icon with a solid bullet `●` in `text-ide-amber`. Hovering changes bullet back to `×` close button.
* **Tab Close Icon**: `text-ide-dim hover:text-white p-0.5 rounded`.

#### Breadcrumbs Bar (`h-6 bg-ide-editor border-b border-ide-border px-4 flex items-center gap-1.5 text-ide-sm text-ide-muted`):
* Interactive path fragments with chevron separators (`src` > `auth` > `tokenService.ts`). Clicking opens sibling picker.

#### Remote Collaborator Cursors & Selections:
* **Remote Cursor Line**: Vertical 2px line in collaborator’s assigned color (`#4fc1ff`).
* **Name Tag Flag**: Tiny floating pill above the cursor displaying collaborator's name: `text-[10px] text-white px-1 py-0.2 rounded-t font-mono` with assigned background color. Automatically fades out after 3 seconds of typing inactivity.
* **Remote Selection**: Semi-transparent background fill (`rgba(79, 193, 255, 0.20)`).

#### Monaco Editor Configuration Preset:
```typescript
export const DEFAULT_MONACO_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions = {
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
  padding: { top: 8, bottom: 8 }
};
```

---

### 4.5 AI Assistant & RAG Panel (Width: 320px Default, Resizable)
The AI panel is positioned on the right, functioning as an intelligent code companion:

```
┌────────────────────────────────────────────────────────┐
│ AI ASSISTANT                           [Clear] [Close] │
├────────────────────────────────────────────────────────┤
│ QUICK ACTIONS:                                         │
│ [ Review Code ]  [ Debug Error ]  [ Explain Function ] │
├────────────────────────────────────────────────────────┤
│ ACTIVE CONTEXT CHIP:                                   │
│ 📎 src/auth.ts: Lines 12-48                           │
├────────────────────────────────────────────────────────┤
│ CHAT STREAM:                                           │
│                                                        │
│ 👤 User (01:14 PM):                                    │
│ "Why does verifyToken fail on expired tokens?"         │
│                                                        │
│ 🤖 Assistant (Grounded via RAG):                       │
│ In `src/auth.ts` (line 34), `jwt.verify` throws a      │
│ `TokenExpiredError` which is caught in an unhandled    │
│ catch block:                                           │
│                                                        │
│ ```python                                              │
│ except jwt.ExpiredSignatureError:                      │
│     return {"error": "token_expired"}, 401             │
│ ```                                                    │
│                                                        │
│ ▼ Used 2 Project Context Chunks                        │
│   • src/auth.ts (Lines 20-55, 91% match)               │
│   • src/middleware.ts (Lines 1-30, 84% match)          │
├────────────────────────────────────────────────────────┤
│ INPUT BAR:                                             │
│ [ Ask AI about selected code or whole project...    ]  │
│ [⚡ Project RAG Active]                      [ Send ▶ ] │
└────────────────────────────────────────────────────────┘
```

#### Panel Breakdown:
1. **Header (`h-9 px-3 flex items-center justify-between border-b border-ide-border bg-ide-sidebar`)**:
   * Title: `AI ASSISTANT` with `Sparkles` icon.
   * Action icons: `Trash2` (clear chat history), `X` (close panel).
2. **Quick Action Pills (`px-3 py-2 flex gap-1.5 flex-wrap border-b border-ide-border`)**:
   * Buttons: `Review`, `Debug`, `Explain`, `Optimize`.
   * Styling: `h-6 px-2 bg-ide-elevated hover:bg-ide-blue hover:text-white border border-ide-border text-ide-muted text-ide-sm rounded transition-colors`.
3. **Active Context Chip**:
   * If code is selected in Monaco, automatically shows: `📎 Selection (28 lines in auth.ts)`. Clicking jumps to or unselects context.
4. **Chat Message Bubbles**:
   * User Message: Right-aligned or clear developer badge `👤 You` with dark elevated pill.
   * Assistant Message: Left-aligned `🤖 AI Pair Programmer`. Formatted using Markdown with highlighted syntax blocks, copy buttons on code blocks, and clickable file link pills.
5. **RAG Citations Drawer (Expandable Accordion)**:
   * Header: `▼ Used 2 Project Context Chunks` with match percentages.
   * Clicking a citation highlights the file in the file explorer and opens the relevant lines in Monaco.
6. **Prompt Input Area**:
   * Multi-line textarea (`max-h-32 bg-ide-activity border border-ide-border focus:border-ide-focus rounded p-2 text-ide-base text-ide-text outline-none resize-none`).
   * Footer row: `RAG Active` indicator badge (`status-ide-green` dot) and `Send` button.

---

### 4.6 Bottom Dock Panel (Height: 224px Default, Resizable)
Collapsible bottom panel with tabbed navigation:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [ TERMINAL ] [ OUTPUT (1) ] [ PROBLEMS (0) ] [ ROOM CHAT (3) ]         [Collapse] [×] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Output Content:                                                                        │
│ [01:20:14] Compiling src/main.py with Python 3.11...                                   │
│ [01:20:15] Container sandbox initialized (Memory: 128MB, CPU: 0.5 cores, Network: None)│
│                                                                                        │
│ Hello, Niranjan!                                                                       │
│ Process completed in 142ms. Exit Code: 0                                               │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Bottom Dock Tabs:
1. **OUTPUT Tab**:
   * Displays container execution logs: compilation status, stdout, stderr, execution wall-clock time, and memory consumption.
   * Error outputs are colored in `text-ide-red`.
2. **TERMINAL Tab**:
   * Stdin batch input field allowing users to supply command-line arguments and input text before hitting "Run".
3. **PROBLEMS Tab**:
   * Structured list of syntax errors and linter issues. Clicking an item jumps directly to the file and line number in Monaco.
4. **ROOM CHAT Tab**:
   * Real-time group messaging for active room collaborators.
   * Messages show author avatar, name in their designated collaborator color, timestamp, and message body.

---

### 4.7 Status Bar (Height: 24px, Far Bottom)
* **Visual Specs**: `h-6 bg-[#007acc] text-white px-3 flex items-center justify-between text-ide-sm select-none font-sans`. *(Can be configured to dark `#181818` with subtle border via settings)*.
* **Left Section (Git & Language)**:
  * Git Branch: `Branch` icon `main*`.
  * Indexing Status: `Sync` icon `RAG: 14/14 Indexed` (turns to spinning wheel during embedding generation).
  * Error/Warning counters: `× 0  ⚠ 0`.
* **Right Section (Editor Metrics & Connectivity)**:
  * Active Line & Column: `Ln 24, Col 12`.
  * Indentation: `Spaces: 4`.
  * Encoding: `UTF-8`.
  * File Language: `Python` (clicking opens language mode picker).
  * Connection Status: `● Connected (42ms)`.
  * Online Collaborators Count: `Users` icon `3 online`.

---

## 5. Modal & Overlay Specifications

### 5.1 Quick Open / Command Palette (`Ctrl/Cmd + P`)
* **Visual Specs**: Centered floating modal, `top-12 w-[540px] bg-ide-elevated border border-ide-border shadow-2xl rounded-md overflow-hidden z-50`.
* **Search Input (`h-10 px-3 flex items-center border-b border-ide-border`)**:
  * Input with `bg-transparent text-white placeholder-ide-muted outline-none text-ide-base w-full`.
* **Results List (`max-h-72 overflow-y-auto py-1`)**:
  * Row: `h-8 px-3 flex items-center justify-between text-ide-base text-ide-text hover:bg-[#2a2d2e] cursor-pointer`.
  * Highlighted Row: `bg-[#04395e] text-white`.
  * Left: File icon + File path (`src/services/` in muted gray, `authService.ts` in white).
  * Right: Jump key hint `Enter`.

---

### 5.2 Invite Collaborators Dialog
* **Visual Specs**: Centered modal, `w-[440px] bg-ide-elevated border border-ide-border p-5 rounded-lg shadow-2xl z-50 text-ide-text`.
* **Title**: `Invite Collaborators to Project`.
* **Link Share Section**:
  * Input field with readonly room URL: `https://code.example.com/room/raft-cluster-89f`.
  * Button: `[ Copy Link ]` (copies URL to clipboard and shows green checkmark toast).
* **Active Members List**:
  * Table showing member name, email, role badge (`Owner`, `Editor`), and status (`Online` with green dot).

---

### 5.3 Authentication & Dashboard Screens
* **Login & Register**:
  * Clean, minimal box (`w-[380px] bg-ide-sidebar border border-ide-border p-6 rounded shadow-xl`).
  * No marketing illustrations or floating background blobs. Simple dark inputs with blue focus borders.
* **Project Dashboard**:
  * Displays user's projects in an information-dense table / row list.
  * Columns: Project Name, Language, Collaborators Count, Last Modified, Actions (Open, Delete).
  * Top button: `[ + New Project ]` in `bg-ide-blue`.

---

## 6. Comprehensive Keyboard Shortcuts

| Action | Windows / Linux | macOS | Scope |
| :--- | :--- | :--- | :--- |
| **Run Code** | `Ctrl + Enter` / `F5` | `Cmd + Enter` / `F5` | Global |
| **Quick File Open** | `Ctrl + P` | `Cmd + P` | Global |
| **Save & Persist File** | `Ctrl + S` | `Cmd + S` | Monaco Editor |
| **Toggle Explorer Sidebar** | `Ctrl + B` | `Cmd + B` | Global |
| **Toggle AI Assistant** | `Ctrl + Shift + A` | `Cmd + Shift + A` | Global |
| **Toggle Bottom Dock Panel**| `Ctrl + J` | `Cmd + J` | Global |
| **Focus Monaco Editor** | `Escape` | `Escape` | Active Panel |
| **Format Code** | `Shift + Alt + F` | `Shift + Option + F` | Monaco Editor |
| **Multi-Cursor Add Line** | `Ctrl + Alt + Down/Up` | `Cmd + Option + Down/Up` | Monaco Editor |
| **Close Active Tab** | `Ctrl + W` | `Cmd + W` | Editor Tabs |

---

## 7. Frontend UI State Management (Zustand Store Contract)

```typescript
export interface UIState {
  // Panel Visibility
  isSidebarOpen: boolean;
  isAiPanelOpen: boolean;
  isBottomPanelOpen: boolean;
  
  // Panel Dimensions (in pixels)
  sidebarWidth: number;       // Default: 256, Min: 180, Max: 450
  aiPanelWidth: number;       // Default: 320, Min: 260, Max: 480
  bottomPanelHeight: number;  // Default: 224, Min: 120, Max: 600
  
  // Active Selections
  activeActivityTab: 'explorer' | 'search' | 'ai' | 'settings';
  activeBottomTab: 'output' | 'terminal' | 'problems' | 'chat';
  
  // Modals & Overlays
  isQuickOpenOpen: boolean;
  isInviteModalOpen: boolean;
  
  // Action Handlers
  setSidebarOpen: (open: boolean) => void;
  setAiPanelOpen: (open: boolean) => void;
  setBottomPanelOpen: (open: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setAiPanelWidth: (width: number) => void;
  setBottomPanelHeight: (height: number) => void;
  setActiveActivityTab: (tab: 'explorer' | 'search' | 'ai' | 'settings') => void;
  setActiveBottomTab: (tab: 'output' | 'terminal' | 'problems' | 'chat') => void;
  toggleQuickOpen: () => void;
  toggleInviteModal: () => void;
}
```

---

## 8. Implementation Phases for Frontend UI

1. **Step 1: Base Design System Setup**
   * Configure `tailwind.config.js` with exact `ide-*` color tokens and `JetBrains Mono` font.
   * Implement root layout shell with resizable panel handles (`h-1` / `w-1` splitter hooks).
2. **Step 2: Activity Bar, Top Bar & Status Bar**
   * Build navigation components with active state markers and tooltips.
3. **Step 3: Explorer File Tree Component**
   * Build recursive directory component with indentation guides, inline creation, and context menus.
4. **Step 4: Monaco Editor Binding & Tabs**
   * Embed `@monaco-editor/react`, implement multi-tab manager, breadcrumb trail, and remote cursor decoration CSS.
5. **Step 5: Bottom Dock (Terminal / Output / Chat)**
   * Implement tab switcher, execution log renderer, and in-room chat stream.
6. **Step 6: AI Assistant & RAG Citation Panel**
   * Build quick action triggers, selection context chip, markdown streaming bubble, and collapsible vector citation accordion.
7. **Step 7: Shortcuts & Polish**
   * Bind global keyboard event listeners (`Ctrl+P`, `Ctrl+B`, `Ctrl+J`, `Ctrl+Enter`) and add micro-interactions for active states.
