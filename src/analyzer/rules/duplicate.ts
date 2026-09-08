/**
 * Exact duplicate detection (Spec §19, Rule 22).
 *
 * Compares document BODIES only, after stripping YAML frontmatter and
 * normalizing. Two files with identical bodies but different frontmatter
 * (description/globs/alwaysApply/metadata) are still duplicate candidates.
 *
 * Cross-file duplicates produce ONE finding listing every file path (Rule 16,
 * Spec §12). This is a high-confidence, deterministic detection.
 */

import { createHash } from "node:crypto";

import { normalizeBody } from "../../parser/normalize.js";
import type { ConfigurationArtifact } from "../../types/configuration.js";
import type { AnalyzerRule } from "../types.js";
import { makeFinding } from "./mapping.js";

/** Normalized-body fingerprint (hash) for a single artifact. */
export function bodyFingerprint(artifact: ConfigurationArtifact): string {
  const normalized = normalizeBody(artifact.content);
  return createHash("sha256").update(normalized).digest("hex");
}

export const duplicateRule: AnalyzerRule = {
  name: "duplicate",
  run(artifacts) {
    // Group artifacts by normalized-body fingerprint (bodies only).
    const groups = new Map<string, string[]>();

    for (const artifact of artifacts) {
      const fp = bodyFingerprint(artifact);
      const existing = groups.get(fp);
      if (existing) {
        existing.push(artifact.path);
      } else {
        groups.set(fp, [artifact.path]);
      }
    }

    const findings = [];

    for (const [, paths] of groups) {
      if (paths.length < 2) continue;

      const sorted = [...paths].sort();
      const sample = sorted.slice(0, 2).join(" and ");
      findings.push(
        makeFinding({
          type: "duplicate",
          filePaths: sorted,
          title: "Identical instructions in multiple files",
          description:
            `Found ${paths.length} files with an identical instruction body ` +
            `(frontmatter ignored): ${sample}.`,
          recommendation:
            `Consider keeping a single source of truth and referencing it, ` +
            `or removing the redundant copies after review.`,
        }),
      );
    }

    return findings;
  },
};
