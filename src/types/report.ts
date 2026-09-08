/**
 * Report model (Spec §12).
 *
 * Findings live at the report level, NOT inside individual artifacts
 * (Rule 16). A configuration artifact only represents the configuration;
 * it never embeds findings about itself.
 */

import type { ConfigurationArtifact } from "./configuration.js";
import type { Finding } from "./finding.js";

export interface AnalysisSummary {
  configurationFiles: number;
  skills: number;
  estimatedTokens: number;
  potentialContextOverhead: number;
}

export interface AnalysisReport {
  summary: AnalysisSummary;
  artifacts: ConfigurationArtifact[];
  findings: Finding[];
}
