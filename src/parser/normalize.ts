/**
 * Body normalization shared by duplicate/repetition detection (Spec §18, §19).
 *
 * Comparison is deterministic and text-based. Normalization:
 * - lowercase
 * - line-ending normalization (CRLF -> LF)
 * - whitespace collapse
 * - markdown formatting normalization (trim lines, drop trailing spaces)
 *
 * The MVP does NOT use semantic similarity (Rule 13).
 */

import { extractFrontmatter } from "./frontmatter.js";

/** Strips YAML frontmatter and returns only the document body. */
export function stripFrontmatter(content: string): string {
  return extractFrontmatter(content).body;
}

/**
 * Normalizes text for comparison: lowercase, LF line endings, collapsed
 * whitespace, trailing-space-trimmed lines.
 */
export function normalizeForComparison(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .toLowerCase()
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .join("\n")
    .trim();
}

/** Computes a stable fingerprint (normalized body) for duplicate detection. */
export function normalizeBody(content: string): string {
  const body = stripFrontmatter(content);
  return normalizeForComparison(body);
}
