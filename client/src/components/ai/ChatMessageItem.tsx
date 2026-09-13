import React, { useState } from 'react';
import { Code2, Copy, Check, ArrowRight } from 'lucide-react';

interface ChatMessageItemProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
  onApplyCode?: (code: string) => void;
}

interface Segment {
  type: 'text' | 'code';
  language?: string;
  content: string;
  isClosed?: boolean;
}

/**
 * Splits raw markdown content into alternating text and fenced code block segments.
 * Accurately handles active streaming where code fences may still be open.
 */
function parseMessageSegments(rawContent: string): Segment[] {
  if (!rawContent) return [];

  const segments: Segment[] = [];
  const fenceRegex = /```([a-zA-Z0-9_-]*)\n?([\s\S]*?)(?:```|$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = fenceRegex.exec(rawContent)) !== null) {
    // 1. Text prior to the code block
    if (match.index > lastIndex) {
      const textChunk = rawContent.slice(lastIndex, match.index);
      if (textChunk.trim()) {
        segments.push({ type: 'text', content: textChunk });
      }
    }

    const language = (match[1] || 'code').trim().toLowerCase();
    const codeContent = match[2] || '';
    const fullMatch = match[0];
    const isClosed = fullMatch.endsWith('```');

    segments.push({
      type: 'code',
      language,
      content: codeContent,
      isClosed
    });

    lastIndex = fenceRegex.lastIndex;
    if (!isClosed) {
      // If fence was unclosed, it reached end of string
      break;
    }
  }

  // 2. Trailing text after the last closed code block
  if (lastIndex < rawContent.length) {
    const trailing = rawContent.slice(lastIndex);
    if (trailing.trim()) {
      segments.push({ type: 'text', content: trailing });
    }
  }

  return segments;
}

/**
 * Helper to render inline formatting: **bold**, `inline code`
 */
function renderInlineFormatting(line: string): React.ReactNode[] {
  // Regex to match **bold** or `inline code`
  const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={idx}
          className="px-1 py-0.5 bg-[#181818] border border-ide-border/80 rounded font-mono text-[11px] text-[#4fc1ff]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

/**
 * Renders formatted text lines with bullet points, headers, and spacing.
 */
const FormattedTextSegment: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');

  return (
    <div className="space-y-1.5 text-xs leading-relaxed text-ide-text">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        // Header: ###
        if (trimmed.startsWith('### ')) {
          return (
            <div key={idx} className="font-semibold text-white text-xs pt-1.5 pb-0.5 flex items-center gap-1.5">
              <span>{trimmed.slice(4)}</span>
            </div>
          );
        }

        // Header: ##
        if (trimmed.startsWith('## ')) {
          return (
            <div key={idx} className="font-bold text-white text-sm pt-2 pb-0.5">
              {trimmed.slice(3)}
            </div>
          );
        }

        // Bullet point: - or *
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1.5">
              <span className="text-ide-blue font-bold text-xs select-none">•</span>
              <span className="flex-1">{renderInlineFormatting(trimmed.slice(2))}</span>
            </div>
          );
        }

        // Numbered list: e.g. 1.
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1.5">
              <span className="text-ide-muted font-mono text-[11px] select-none">{numMatch[1]}.</span>
              <span className="flex-1">{renderInlineFormatting(numMatch[2])}</span>
            </div>
          );
        }

        // Standard paragraph
        return (
          <p key={idx} className="leading-relaxed">
            {renderInlineFormatting(line)}
          </p>
        );
      })}
    </div>
  );
};

/**
 * Dedicated Code Box component with copy and apply to editor actions
 */
const CodeBoxSegment: React.FC<{
  language: string;
  code: string;
  onApplyCode?: (code: string) => void;
}> = ({ language, code, onApplyCode }) => {
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);

  const cleanCode = code.replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    if (onApplyCode) {
      onApplyCode(cleanCode);
      setApplied(true);
      setTimeout(() => setApplied(false), 2500);
    }
  };

  return (
    <div className="my-2.5 rounded-md border border-ide-border bg-[#181818] overflow-hidden shadow-sm">
      {/* Code Box Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#202020] border-b border-ide-border text-ide-muted text-[11px]">
        <div className="flex items-center gap-1.5 font-mono">
          <Code2 className="w-3.5 h-3.5 text-ide-blue" />
          <span className="font-semibold uppercase tracking-wider text-[10px] text-ide-dim">
            {language || 'code'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {onApplyCode && (
            <button
              onClick={handleApply}
              title="Apply this code directly into the active editor tab"
              className="px-2 py-0.5 bg-[#2a2d2e] hover:bg-[#37373d] text-white text-[10px] rounded flex items-center gap-1 transition-colors border border-ide-border"
            >
              {applied ? (
                <>
                  <Check className="w-3 h-3 text-ide-green" />
                  <span className="text-ide-green font-medium">Applied</span>
                </>
              ) : (
                <>
                  <ArrowRight className="w-3 h-3 text-ide-blue" />
                  <span>Apply to Editor</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={handleCopy}
            title="Copy code to clipboard"
            className="px-2 py-0.5 bg-[#2a2d2e] hover:bg-[#37373d] text-ide-dim hover:text-white text-[10px] rounded flex items-center gap-1 transition-colors border border-ide-border"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-ide-green" />
                <span className="text-ide-green font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Content */}
      <pre className="p-3 font-mono text-xs text-[#d4d4d4] overflow-x-auto leading-relaxed select-all whitespace-pre">
        <code>{cleanCode}</code>
      </pre>
    </div>
  );
};

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  role,
  content,
  isStreaming = false,
  onApplyCode
}) => {
  if (role === 'user') {
    return (
      <div className="flex flex-col items-end">
        <div className="max-w-[88%] rounded-lg p-2.5 bg-ide-blue text-white rounded-br-xs text-xs leading-relaxed whitespace-pre-wrap select-text shadow-sm">
          {content}
        </div>
      </div>
    );
  }

  const segments = parseMessageSegments(content);

  return (
    <div className="flex flex-col items-start w-full">
      <div className="w-full rounded-lg p-3 bg-[#252526] text-ide-text border border-ide-border rounded-bl-xs select-text shadow-sm space-y-2">
        {segments.length === 0 ? (
          <div className="text-xs text-ide-muted italic">Thinking...</div>
        ) : (
          segments.map((seg, idx) => {
            if (seg.type === 'code') {
              return (
                <CodeBoxSegment
                  key={idx}
                  language={seg.language || 'code'}
                  code={seg.content}
                  onApplyCode={onApplyCode}
                />
              );
            }
            return <FormattedTextSegment key={idx} text={seg.content} />;
          })
        )}

        {isStreaming && (
          <span className="inline-block w-1.5 h-3 ml-1 bg-ide-blue animate-pulse align-middle" />
        )}
      </div>
    </div>
  );
};
