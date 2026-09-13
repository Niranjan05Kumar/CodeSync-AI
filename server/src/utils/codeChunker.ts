/**
 * Language-Aware Recursive Code Chunker
 * Strictly defined by AGENTS.md & FINAL_TECHNICAL_REPORT.md Section 8.1
 */

export interface CodeChunk {
  chunkIndex: number;
  content: string;
  startLine: number;
  endLine: number;
  tokenCount: number;
}

// Target chunk size: ~500 tokens (~2000 chars), overlap: ~80 tokens (~320 chars)
const TARGET_CHUNK_CHARS = 2000;
const OVERLAP_CHARS = 320;

// Hierarchical code boundary splitters
const CODE_SEPARATORS = [
  /\n(?=class\s+)/g,
  /\n(?=(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function|def|interface|type|struct|enum)\s+)/g,
  /\n\n+/g,
  /\n/g,
  /\s+/g
];

/**
 * Splits source code into semantic, overlapping chunks while computing
 * accurate 1-indexed start and end line numbers.
 */
export function chunkCode(code: string, _filePath?: string): CodeChunk[] {
  if (!code || code.trim().length === 0) {
    return [];
  }

  // Pre-compute newline offsets for fast line number mapping
  const lineStartOffsets: number[] = [0];
  for (let i = 0; i < code.length; i++) {
    if (code[i] === '\n') {
      lineStartOffsets.push(i + 1);
    }
  }

  function getLineNumber(charOffset: number): number {
    let low = 0;
    let high = lineStartOffsets.length - 1;
    let line = 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (lineStartOffsets[mid] <= charOffset) {
        line = mid + 1;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return line;
  }

  const chunks: CodeChunk[] = [];
  let currentOffset = 0;
  let chunkIndex = 0;

  while (currentOffset < code.length) {
    let endOffset = Math.min(currentOffset + TARGET_CHUNK_CHARS, code.length);

    // If not at the very end of code, search backwards for a clean separator
    if (endOffset < code.length) {
      let foundSeparator = false;
      const windowStart = Math.max(currentOffset + TARGET_CHUNK_CHARS - OVERLAP_CHARS, currentOffset);
      const searchSubstr = code.substring(windowStart, endOffset + 100);

      for (const sep of CODE_SEPARATORS) {
        sep.lastIndex = 0;
        let match: RegExpExecArray | null;
        let lastValidSepIndex = -1;

        while ((match = sep.exec(searchSubstr)) !== null) {
          const globalMatchOffset = windowStart + match.index;
          if (globalMatchOffset > currentOffset && globalMatchOffset <= endOffset + 80) {
            lastValidSepIndex = globalMatchOffset;
          }
        }

        if (lastValidSepIndex !== -1) {
          endOffset = lastValidSepIndex;
          foundSeparator = true;
          break;
        }
      }

      if (!foundSeparator) {
        // Fallback: search for last newline
        const lastNewline = code.lastIndexOf('\n', endOffset);
        if (lastNewline > currentOffset) {
          endOffset = lastNewline;
        }
      }
    }

    const chunkContent = code.substring(currentOffset, endOffset).trim();
    if (chunkContent.length > 0) {
      const startLine = getLineNumber(currentOffset);
      const endLine = getLineNumber(Math.max(currentOffset, endOffset - 1));
      // Estimate token count (~4 characters per token)
      const tokenCount = Math.max(1, Math.ceil(chunkContent.length / 4));

      chunks.push({
        chunkIndex,
        content: chunkContent,
        startLine,
        endLine: Math.max(startLine, endLine),
        tokenCount
      });
      chunkIndex++;
    }

    // Advance offset with overlap
    if (endOffset >= code.length) {
      break;
    }

    const nextOffset = Math.max(currentOffset + 1, endOffset - OVERLAP_CHARS);
    currentOffset = nextOffset;
  }

  return chunks;
}
