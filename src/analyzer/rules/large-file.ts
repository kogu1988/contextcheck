/**
 * Large instruction detection (Spec §20).
 *
 * A file being large is not inherently bad, but a file above the token
 * threshold may contribute significantly to model context. In the MVP both
 * the notice and warning thresholds map to `label=CONTEXT`, `severity=info`
 * through the normative mapping; we only ever emit `large-file` findings.
 *
 * Note: the `warningFileTokens` threshold is reserved (Spec §11) and produces
 * no additional severity in the MVP — the taxonomy keeps `info` here.
 */

import { DEFAULT_ANALYSIS_OPTIONS, type AnalyzerRule } from "../types.js";
import { makeFinding } from "./mapping.js";

export const largeFileRule: AnalyzerRule = {
  name: "large-file",
  run(artifacts, context) {
    const threshold =
      context.options.largeFileTokens ??
      DEFAULT_ANALYSIS_OPTIONS.largeFileTokens;
    const findings = [];

    for (const artifact of artifacts) {
      const tokens = artifact.metadata.estimatedTokens;
      if (tokens <= threshold) continue;

      findings.push(
        makeFinding({
          type: "large-file",
          filePaths: [artifact.path],
          title: "Instruction file is unusually large",
          description:
            `${artifact.path} is estimated at ~${formatTokens(tokens)} tokens. ` +
            `This file is relatively large and may contribute significantly to model context.`,
          recommendation:
            `Consider whether all sections are still needed, or split unrelated ` +
            `instructions into smaller scoped files.`,
        }),
      );
    }

    return findings;
  },
};

/** Formats a token count with thousands separators, e.g. 4800 -> "4,800". */
export function formatTokens(tokens: number): string {
  return tokens.toLocaleString("en-US");
}
