/**
 * Analyzer contract (Spec §15, §51).
 *
 * Each rule runs independently over the discovered artifacts and returns its
 * own findings. Rules are kept free of presentation concerns (Rule 15) and
 * platform-specific logic lives in adapters (Rule 14).
 */

import type { ConfigurationArtifact } from "../types/configuration.js";
import type { Finding } from "../types/finding.js";

/** Analysis-wide options, sourced from `.contextcheck.json` (Spec §52). */
export interface AnalysisOptions {
  /** Files larger than this (estimated tokens) become large-file findings. */
  largeFileTokens: number;
  /** Reserved for future `warning` severity (Spec §20). Not used in MVP. */
  warningFileTokens: number;
  /** Git history window (days) used by scoped-rule analysis (Spec §24, §52). */
  gitWindowDays: number;
}

export const DEFAULT_ANALYSIS_OPTIONS: AnalysisOptions = {
  largeFileTokens: 2000,
  warningFileTokens: 4000,
  gitWindowDays: 90,
};

/** Context handed to every rule (git state, options, repo root). */
export interface AnalysisContext {
  rootPath: string;
  options: AnalysisOptions;
  /** Paths changed in the Git window, when available. */
  changedFilePaths?: string[];
  /** Whether Git history is sufficient for scoped-rule analysis (Spec §24). */
  gitHistorySufficient?: boolean;
}

/** A rule producing zero or more findings from the same artifact set. */
export interface AnalyzerRule {
  name: string;
  run(
    artifacts: ConfigurationArtifact[],
    context: AnalysisContext,
  ): Promise<Finding[]> | Finding[];
}

/** A convenience no-op rule used to keep the pipeline stable while built. */
export function emptyFindings(): Finding[] {
  return [];
}
