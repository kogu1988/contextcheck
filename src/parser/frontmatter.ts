/**
 * YAML frontmatter extraction (Spec §17).
 *
 * Frontmatter is an optional `---`-delimited block at the very start of a
 * file. It is stripped from the body before analysis (Rule 22) and parsed
 * into an object so adapter/analyzer logic can read keys such as `globs`,
 * `alwaysApply` and `description`.
 *
 * The parser never mutates content and tolerates malformed YAML: on a parse
 * error it returns the raw body so the analyzer can still produce partial
 * results (Spec §34).
 */

import { parse as parseYaml } from "yaml";

export interface FrontmatterResult {
  /** Parsed YAML object, or undefined when there is no valid frontmatter. */
  data?: Record<string, unknown>;
  /** Document body with the frontmatter block removed (CRLF normalized). */
  body: string;
  /** True when a `---` block was present but failed to parse. */
  invalid?: boolean;
}

const DELIMITER = "---";

/**
 * Extracts and parses the leading YAML frontmatter block, returning the data
 * and the remaining body. Uses a line-based scan so empty frontmatter blocks
 * and mixed EOL styles are handled consistently.
 */
export function extractFrontmatter(content: string): FrontmatterResult {
  const lines = content.split(/\r\n|[\r\n]/);
  if (lines.length === 0) return { body: content };

  if (lines[0]?.trim() !== DELIMITER) {
    return { body: content };
  }

  // Find the closing delimiter line. Scan from line 1 onward; the body starts
  // after it. If none is found, treat frontmatter as absent (partial result).
  let closeIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === DELIMITER) {
      closeIndex = i;
      break;
    }
  }

  if (closeIndex === -1) {
    return { body: content, invalid: true };
  }

  const rawBlock = lines.slice(1, closeIndex).join("\n").trim();
  const body = lines
    .slice(closeIndex + 1)
    .join("\n")
    .replace(/\r\n?/g, "\n");

  if (rawBlock.length === 0) {
    return { body, data: {} };
  }

  try {
    const parsed = parseYaml(rawBlock);
    if (parsed == null) {
      return { body, data: {} };
    }
    return { body, data: isRecord(parsed) ? parsed : {} };
  } catch {
    // Malformed YAML: keep the body so analysis can continue (Spec §34).
    return { body, invalid: true };
  }
}

/** Whether every key we care about should be treated as an object. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
