/**
 * Parsing orchestration (Spec §16, §17).
 *
 * Combines frontmatter, scope, markdown and plain-text parsers to produce a
 * single normalized view of a configuration file's content.
 *
 * The parser never mutates source content. Malformed input degrades to a
 * partial result so the analyzer can continue (Spec §34).
 */

import type { ConfigurationScope } from "../types/configuration.js";
import { extractFrontmatter } from "./frontmatter.js";
import { extractMarkdownSections, type MarkdownSection } from "./markdown.js";
import { chunkPlainText, type TextBlock } from "./plain-text.js";
import { parseScope } from "./scope.js";

export interface ParsedConfiguration {
  /** Parsed frontmatter data (undefined when none/invalid). */
  data?: Record<string, unknown>;
  /** Document body with frontmatter removed. */
  body: string;
  /** Normalized scope derived from frontmatter. */
  scope?: ConfigurationScope;
  /** Markdown sections (empty for heading-less files). */
  sections: MarkdownSection[];
  /** Plain-text blocks (empty for markdown files with headings). */
  blocks: TextBlock[];
  /** True when frontmatter was present but malformed. */
  invalidFrontmatter: boolean;
}

/**
 * Builds a normalized view of content.
 *
 * - Files authored in markdown (instruction, skill, .mdc rules) are split into
 *   sections by headings; the plain-text block chunker is used as a fallback
 *   when there are no headings (Rule 21).
 */
export function parseConfiguration(content: string): ParsedConfiguration {
  const { data, body, invalid } = extractFrontmatter(content);
  const scope = parseScope(data);

  const sections = extractMarkdownSections(body);
  const hasHeadings = sections.length > 0;

  return {
    data,
    body,
    scope,
    sections,
    blocks: hasHeadings ? [] : chunkPlainText(body),
    invalidFrontmatter: invalid === true,
  };
}
