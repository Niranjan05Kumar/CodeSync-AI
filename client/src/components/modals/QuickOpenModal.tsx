import React, { useState, useEffect, useRef } from 'react';
import { Search, FileCode, FileText, FileJson, File, X } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useProjectStore } from '../../store/useProjectStore';
import { FileTreeNode } from '../../types';

interface FlatFile {
  id: string;
  name: string;
  path: string;
  language: string;
}

export const QuickOpenModal: React.FC = () => {
  const { isQuickOpenOpen, setQuickOpenOpen } = useUIStore();
  const { fileTree, openFile } = useProjectStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Flatten files
  const flattenFiles = (nodes: FileTreeNode[]): FlatFile[] => {
    const list: FlatFile[] = [];
    const traverse = (items: FileTreeNode[]) => {
      for (const item of items) {
        if (!item.isDirectory) {
          list.push({
            id: item.id,
            name: item.name,
            path: item.path,
            language: item.language || 'plaintext'
          });
        }
        if (item.children) {
          traverse(item.children);
        }
      }
    };
    traverse(nodes);
    return list;
  };

  const allFiles = flattenFiles(fileTree);
  const filteredFiles = allFiles.filter((f) =>
    f.name.toLowerCase().includes(query.toLowerCase()) ||
    f.path.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isQuickOpenOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isQuickOpenOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isQuickOpenOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredFiles.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredFiles.length) % Math.max(1, filteredFiles.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filteredFiles[selectedIndex];
      if (target) {
        openFile(target);
        setQuickOpenOpen(false);
      }
    } else if (e.key === 'Escape') {
      setQuickOpenOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-xs">
      <div 
        className="fixed inset-0" 
        onClick={() => setQuickOpenOpen(false)} 
      />

      <div className="relative w-full max-w-xl bg-ide-elevated border border-ide-border rounded-lg shadow-2xl overflow-hidden flex flex-col z-10">
        {/* Search Input Bar */}
        <div className="px-4 py-3 border-b border-ide-border flex items-center gap-3 bg-[#1e1e1e]">
          <Search className="w-4 h-4 text-ide-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search files by name (e.g. main.py, index.ts)..."
            className="w-full bg-transparent text-white text-ide-base placeholder-ide-dim outline-none"
          />
          <button
            onClick={() => setQuickOpenOpen(false)}
            className="text-ide-muted hover:text-white p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-1 divide-y divide-ide-border/30">
          {filteredFiles.length > 0 ? (
            filteredFiles.map((file, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={file.id}
                  onClick={() => {
                    openFile(file);
                    setQuickOpenOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-3 py-2 flex items-center justify-between cursor-pointer rounded transition-colors ${
                    isSelected
                      ? 'bg-ide-blue text-white'
                      : 'hover:bg-[#2a2d2e] text-ide-text'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {getFileIcon(file.name)}
                    <span className="text-ide-sm font-medium truncate">
                      {file.name}
                    </span>
                  </div>
                  <span className={`text-ide-xs truncate ml-4 ${isSelected ? 'text-blue-100' : 'text-ide-dim'}`}>
                    {file.path}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-ide-dim text-ide-sm">
              No matching files found.
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-3 py-1.5 bg-[#1a1a1a] border-t border-ide-border/50 text-[11px] text-ide-dim flex items-center justify-between select-none">
          <span>Navigate with <kbd className="px-1 py-0.5 bg-[#252526] rounded border border-ide-border">↑</kbd> <kbd className="px-1 py-0.5 bg-[#252526] rounded border border-ide-border">↓</kbd></span>
          <span>Open with <kbd className="px-1 py-0.5 bg-[#252526] rounded border border-ide-border">Enter</kbd></span>
        </div>
      </div>
    </div>
  );
};

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'py':
      return <FileCode className="w-4 h-4 text-yellow-400 shrink-0" />;
    case 'ts':
    case 'tsx':
      return <FileCode className="w-4 h-4 text-sky-400 shrink-0" />;
    case 'js':
    case 'jsx':
      return <FileCode className="w-4 h-4 text-amber-300 shrink-0" />;
    case 'json':
      return <FileJson className="w-4 h-4 text-amber-400 shrink-0" />;
    case 'md':
      return <FileText className="w-4 h-4 text-gray-300 shrink-0" />;
    default:
      return <File className="w-4 h-4 text-ide-muted shrink-0" />;
  }
}
