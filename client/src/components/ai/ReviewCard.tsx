import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, AlertCircle, Info, Check, Copy, ArrowRight, Code } from 'lucide-react';
import { ReviewIssue } from '../../api/aiApi';

interface ReviewCardProps {
  issue: ReviewIssue;
  onApplyFix?: (fix: string) => void;
  onJumpToLine?: (startLine: number) => void;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ issue, onApplyFix, onJumpToLine }) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isApplied, setIsApplied] = useState(false);

  const getSeverityStyle = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return {
          badge: 'bg-[#5a1d1d] text-[#f14c4c] border-[#8a2a2a]',
          icon: <ShieldAlert className="w-3.5 h-3.5 text-[#f14c4c]" />,
          border: 'border-l-[#f14c4c]'
        };
      case 'HIGH':
        return {
          badge: 'bg-[#4e2a14] text-[#ce9178] border-[#80421e]',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-[#ce9178]" />,
          border: 'border-l-[#ce9178]'
        };
      case 'MEDIUM':
        return {
          badge: 'bg-[#3b3419] text-[#e5a93c] border-[#6b5d2c]',
          icon: <AlertCircle className="w-3.5 h-3.5 text-[#e5a93c]" />,
          border: 'border-l-[#e5a93c]'
        };
      default:
        return {
          badge: 'bg-[#1c324a] text-[#4fc1ff] border-[#294c73]',
          icon: <Info className="w-3.5 h-3.5 text-[#4fc1ff]" />,
          border: 'border-l-[#4fc1ff]'
        };
    }
  };

  const style = getSeverityStyle(issue.severity);

  const handleCopy = () => {
    navigator.clipboard.writeText(issue.suggestedFix);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleApply = () => {
    if (onApplyFix) {
      onApplyFix(issue.suggestedFix);
      setIsApplied(true);
      setTimeout(() => setIsApplied(false), 2500);
    }
  };

  const [startLine, endLine] = issue.lineRange || [1, 1];

  return (
    <div className={`bg-[#252526] border border-ide-border border-l-4 ${style.border} rounded p-3 space-y-2 select-text shadow-sm`}>
      {/* Header Badges */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border flex items-center gap-1 ${style.badge}`}>
            {style.icon}
            <span>{issue.severity}</span>
          </span>
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[#1e1e1e] text-ide-dim border border-ide-border rounded uppercase">
            {issue.type}
          </span>
        </div>

        {/* Line range pill */}
        <button
          onClick={() => onJumpToLine && onJumpToLine(startLine)}
          className="text-[11px] font-mono text-ide-blue hover:underline flex items-center gap-1 cursor-pointer"
          title={`Jump to line ${startLine}`}
        >
          <span>Line {startLine === endLine ? startLine : `${startLine}-${endLine}`}</span>
          <ArrowRight className="w-2.5 h-2.5" />
        </button>
      </div>

      {/* Message */}
      <p className="text-ide-sm text-ide-text leading-relaxed">
        {issue.message}
      </p>

      {/* Suggested Fix Box */}
      {issue.suggestedFix && (
        <div className="pt-1">
          <div className="flex items-center justify-between text-[11px] text-ide-muted mb-1 font-sans">
            <span className="flex items-center gap-1">
              <Code className="w-3 h-3 text-ide-green" />
              <span>Suggested Fix</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopy}
                className="p-1 text-ide-muted hover:text-white rounded hover:bg-[#2e2e2f] transition-colors"
                title="Copy suggested code"
              >
                {isCopied ? <Check className="w-3 h-3 text-ide-green" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>

          <pre className="p-2 bg-[#1b1b1c] border border-ide-border/80 rounded font-mono text-[11px] text-ide-text overflow-x-auto whitespace-pre-wrap select-all">
            {issue.suggestedFix}
          </pre>

          {/* Action Button */}
          {onApplyFix && (
            <div className="pt-2 flex justify-end">
              <button
                onClick={handleApply}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
                  isApplied
                    ? 'bg-ide-green text-black font-semibold'
                    : 'bg-ide-blue hover:bg-ide-blueHover text-white shadow-xs'
                }`}
              >
                {isApplied ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>Applied to Editor</span>
                  </>
                ) : (
                  <span>Apply Fix to File</span>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
