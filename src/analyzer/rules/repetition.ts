/**
 * Repetition detection (Spec §18, Rule 21).
 *
 * Two strategies:
 * - Markdown files: compare `heading + normalized section content`.
 * - Files without headings: plain-text block fallback (paragraph/block
 *   chunking), ignoring very short blocks.
 *
 * Only exact normalized text blocks are repetition candidates. The MVP does
 * NOT use semantic similarity (Rule 13): semantically similar but textually
 * different instructions are not flagged.
 */

import {
  extractMarkdownSections,
  type MarkdownSection,
} from "../../parser/markdown.js";
import { normalizeForComparison } from "../../parser/normalize.js";
import { chunkPlainText, type TextBlock } from "../../parser/plain-text.js";
import { stripFrontmatter } from "../../parser/normalize.js";
import type { ConfigurationArtifact } from "../../types/configuration.js";
import type { AnalyzerRule } from "../types.js";
import { makeFinding } from "./mapping.js";

interface RepeatedUnit {
  artifactPath: string;
  /** Normalized text used for comparison (heading + content, or block). */
  key: string;
  /** Human-readable repr, e.g. `# Heading` or a block preview. */
  display: string;
}

export const repetitionRule: AnalyzerRule = {
  name: "repetition",
  run(artifacts) {
    const units: RepeatedUnit[] = [];

    for (const artifact of artifacts) {
      for (const unit of buildUnits(artifact)) {
        units.push({
          artifactPath: artifact.path,
          key: unit.key,
          display: unit.display,
        });
      }
    }

    // Group by normalized key; a key appearing more than once is a repetition.
    const byKey = new Map<string, RepeatedUnit[]>();
    for (const unit of units) {
      const list = byKey.get(unit.key) ?? [];
      list.push(unit);
      byKey.set(unit.key, list);
    }

    const findings = [];

    for (const matches of byKey.values()) {
      if (matches.length < 2) continue;

      const paths = [...new Set(matches.map((m) => m.artifactPath))];
      const detail = matches
        .map((m) => `${m.artifactPath} (${m.display})`)
        .slice(0, 3)
        .join("; ");

      findings.push(
        makeFinding({
          type: "repetition",
          filePaths: paths,
          title: "Repeated instruction section",
          description:
            `A normalized section appears ${matches.length} times across ` +
            `${paths.length} file(s): ${detail}.`,
          recommendation:
            `Review whether the repeated guidance can be consolidated into a ` +
            `single source. Textually identical, not semantically similar.`,
        }),
      );
    }

    return findings;
  },
};

/** Extracts comparison units (markdown sections or plain-text blocks). */
export function buildUnits(
  artifact: ConfigurationArtifact,
): Array<{ key: string; display: string }> {
  const body = stripFrontmatter(artifact.content);
  const sections = extractMarkdownSections(body);

  if (sections.length > 0) {
    return sections.map((section) => sectionUnit(section));
  }

  return chunkPlainText(body).map((block) => blockUnit(block));
}

function sectionUnit(section: MarkdownSection): {
  key: string;
  display: string;
} {
  // heading + normalized content (Spec §18).
  const key = normalizeForComparison(`${section.heading}${section.content}`);
  return { key, display: `# ${section.heading}` };
}

function blockUnit(block: TextBlock): { key: string; display: string } {
  const preview =
    block.normalized.length > 24
      ? `${block.normalized.slice(0, 24)}...`
      : block.normalized;
  return { key: block.normalized, display: `"${preview}"` };
}
