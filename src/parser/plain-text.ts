/**
 * Plain-text block chunking (Spec §18 "Plain-text fallback").
 *
 * For files without markdown headings (e.g. `.cursorrules`), fall back to
 * paragraph/block-based chunking:
 *   1. split on blank lines into paragraphs/blocks
 *   2. ignore very short blocks
 *   3. normalize whitespace
 *   4. compare normalized blocks
 *
 * The MVP does NOT use semantic similarity: only exact normalized text blocks
 * are considered repetition candidates (Rule 21).
 */

/** Blocks shorter than this many characters are ignored as noise. */
export const MIN_BLOCK_CHARS = 8;

export interface TextBlock {
  /** Whitespace-normalized text used for comparison. */
  normalized: string;
  /** The block's raw text. */
  raw: string;
  /** Starting line index (0-based) in the original content. */
  startLine: number;
}

/** Normalizes a block: collapse whitespace and trim. */
export function normalizeBlock(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Splits plain text into blocks separated by one or more blank lines.
 * Empty and very short blocks are dropped per Spec §18 step 2.
 */
export function chunkPlainText(text: string): TextBlock[] {
  const lines = text.split(/\r\n|[\r\n]/);
  const blocks: TextBlock[] = [];

  let buffer: string[] = [];
  let bufferStart = 0;

  function flush(): void {
    if (buffer.length === 0) return;
    const raw = buffer.join("\n").trim();
    const normalized = normalizeBlock(raw);
    if (normalized.trim().length >= MIN_BLOCK_CHARS) {
      blocks.push({ normalized, raw, startLine: bufferStart });
    }
    buffer = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const isBlank = (lines[i] ?? "").trim().length === 0;
    if (isBlank) {
      flush();
      continue;
    }
    if (buffer.length === 0) bufferStart = i;
    buffer.push(lines[i] ?? "");
  }

  flush();
  return blocks;
}
