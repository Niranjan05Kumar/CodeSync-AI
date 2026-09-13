import React, { useState } from 'react';
import { FileCode, ChevronDown, ChevronRight, ExternalLink, Sparkles } from 'lucide-react';
import { CitedSource } from '../../api/ragApi';

interface RAGCitationsProps {
  sources: CitedSource[];
  onOpenCitation?: (filePath: string, startLine: number) => void;
}

export const RAGCitations: React.FC<RAGCitationsProps> = ({ sources, onOpenCitation }) => {
  const [expandedIndices, setExpandedIndices] = useState<number[]>([0]);

  if (!sources || sources.length === 0) return null;

  const toggleExpand = (index: number) => {
    setExpandedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  return (
    <div className="space-y-2 pt-2 select-text">
      <div className="flex items-center gap-1.5 text-ide-xs font-semibold text-white tracking-wide uppercase">
        <Sparkles className="w-3.5 h-3.5 text-ide-amber" />
        <span>Cited Project Sources ({sources.length})</span>
      </div>

      <div className="space-y-1.5">
        {sources.map((source, index) => {
          const isExpanded = expandedIndices.includes(index);
          const matchPercent = Math.min(100, Math.max(1, Math.round(source.similarityScore * 100)));

          return (
            <div
              key={index}
              className="bg-[#252526] border border-ide-border rounded overflow-hidden shadow-xs transition-colors"
            >
              {/* Citation Header Bar */}
              <div
                onClick={() => toggleExpand(index)}
                className="px-2.5 py-2 flex items-center justify-between gap-2 hover:bg-[#2e2e2f] cursor-pointer select-none text-xs"
              >
                <div className="flex items-center gap-1.5 truncate">
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-ide-muted shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-ide-muted shrink-0" />
                  )}
                  <FileCode className="w-3.5 h-3.5 text-ide-blue shrink-0" />
                  <span className="font-medium text-white truncate">{source.filePath}</span>
                  <span className="text-[10px] text-ide-muted font-mono shrink-0">
                    Ln {source.startLine}–{source.endLine}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      matchPercent >= 70
                        ? 'bg-[#1b432a] text-ide-green border border-[#27683e]'
                        : 'bg-[#2a3746] text-ide-blue border border-[#3b5168]'
                    }`}
                  >
                    {matchPercent}% match
                  </span>

                  {onOpenCitation && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenCitation(source.filePath, source.startLine);
                      }}
                      className="p-1 hover:text-white text-ide-muted hover:bg-ide-blue rounded transition-colors"
                      title="Open file at line in editor"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Chunk Snippet Preview */}
              {isExpanded && source.chunkContent && (
                <div className="border-t border-ide-border/50 bg-[#19191a] p-2 font-mono text-[11px] text-ide-text">
                  <pre className="overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-48 select-all">
                    {source.chunkContent}
                  </pre>
                  {onOpenCitation && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => onOpenCitation(source.filePath, source.startLine)}
                        className="px-2 py-1 bg-ide-blue hover:bg-ide-blueHover text-white text-[11px] rounded flex items-center gap-1 font-medium transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Jump to File in Editor</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
