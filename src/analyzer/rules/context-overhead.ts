/**
 * Context overhead aggregation (Spec §22).
 *
 * Potential Context Overhead is a deterministic estimate of tokens that may
 * be redundant, computed from signals already detected by other rules
 * (duplicate content, repeated sections/blocks). The MVP does NOT detect
 * semantic redundancy, and we never use "wasted tokens" — only "Potential
 * Context Overhead" (Spec §22).
 */

import type { ConfigurationArtifact } from "../../types/configuration.js";
import type { Finding } from "../../types/finding.js";
import { makeFinding } from "./mapping.js";

/**
 * Estimates redundant tokens from the duplicate/repetition findings. Uses
 * only deterministic signals; bounds each category to avoid double counting.
 */
export function estimateOverhead(
  artifacts: ConfigurationArtifact[],
  findings: Finding[],
): number {
  let overhead = 0;

  // Duplicate groups: each extra copy beyond the first is redundant.
  for (const f of findings) {
    if (f.type !== "duplicate" || f.filePaths.length <= 1) continue;
    const group = artifacts.filter((a) => f.filePaths.includes(a.path));
    const avg = group.length
      ? Math.round(
          group.reduce((sum, a) => sum + a.metadata.estimatedTokens, 0) /
            group.length,
        )
      : 0;
    overhead += avg * (f.filePaths.length - 1);
  }

  // Repetitions: a bounded per-extra-occurrence contribution.
  for (const f of findings) {
    if (f.type !== "repetition") continue;
    overhead += Math.min(800, 200 * Math.max(0, f.filePaths.length));
  }

  return Math.round(overhead);
}

/**
 * Builds a `context-overhead` finding when overhead is meaningful.
 * Returns `null` when overhead is negligible (avoids noisy output).
 */
export function buildContextOverheadFinding(
  overhead: number,
  sourcePaths: string[],
): Finding | null {
  if (overhead <= 0) return null;

  return makeFinding({
    type: "context-overhead",
    filePaths: sourcePaths.length > 0 ? sourcePaths : ["."],
    title: "Potential context overhead",
    description:
      `Potential Context Overhead ~${overhead.toLocaleString("en-US")} tokens ` +
      `based on duplicate content and repeated sections.`,
    recommendation:
      `Review the flagged duplicates and repetitions; consolidating them may ` +
      `reduce how much of the model context your configuration uses.`,
  });
}
