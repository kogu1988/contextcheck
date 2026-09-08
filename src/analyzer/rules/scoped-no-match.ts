/**
 * Scoped no-match finding (Spec §23, §25, Rule 18).
 *
 * Only runs when Git history is sufficient. For each artifact with `globs`
 * (scope patterns), if NONE of its patterns matched any file change in the
 * window, produce a `scoped-no-match` review finding.
 *
 * This is a REVIEW CANDIDATE, never an "unused"/"obsolete" label (Rule 8,
 * Rule 9). Git activity alone is not evidence a rule is dead.
 */

import { matchesChangedFile } from "../../git/history.js";
import type { ConfigurationArtifact } from "../../types/configuration.js";
import type { AnalyzerRule } from "../types.js";
import { makeFinding } from "./mapping.js";

export const scopedNoMatchRule: AnalyzerRule = {
  name: "scoped-no-match",
  run(artifacts, context) {
    // Rule 18: skip entirely when Git history is insufficient.
    if (!context.gitHistorySufficient) {
      return [];
    }

    const changed = context.changedFilePaths ?? [];
    const findings = [];

    for (const artifact of artifacts) {
      const patterns = artifact.scope?.patterns;
      if (!patterns || patterns.length === 0) continue;

      const anyMatched = patterns.some((pattern) =>
        matchesChangedFile(pattern, changed),
      );
      if (anyMatched) continue;

      findings.push(
        makeFinding({
          type: "scoped-no-match",
          filePaths: [artifact.path],
          title: "No matching file changes for scoped rule",
          description:
            `No file changes matched the scoped patterns for ${artifact.path} ` +
            `in the analyzed Git history window.`,
          recommendation:
            `This does NOT mean the rule is unused. Consider reviewing its ` +
            `scope and purpose.`,
        }),
      );
    }

    return findings;
  },
};

/** Whether an artifact has glob-scoped patterns that scoped analysis applies to. */
export function hasScopedPatterns(artifact: ConfigurationArtifact): boolean {
  return Boolean(artifact.scope?.patterns?.length);
}
