/**
 * Analyzer engine (Spec §51).
 *
 * Runs each registered rule independently over the discovered artifacts and
 * aggregates their findings into an `AnalysisReport`. Rules are isolation
 * boundaries: a failure in one must not prevent the others from running
 * (Spec §34), and presentation never affects analysis (Rule 15).
 */

import type { ConfigurationArtifact } from "../types/configuration.js";
import type { Finding } from "../types/finding.js";
import type { AnalysisReport } from "../types/report.js";
import type { AnalysisContext, AnalyzerRule } from "./types.js";
import {
  buildContextOverheadFinding,
  estimateOverhead,
} from "./rules/context-overhead.js";
import { duplicateRule } from "./rules/duplicate.js";
import { highStakesRule } from "./rules/high-stakes.js";
import { largeFileRule } from "./rules/large-file.js";
import { repetitionRule } from "./rules/repetition.js";
import { scopedNoMatchRule } from "./rules/scoped-no-match.js";

export interface AnalyzeInput {
  artifacts: ConfigurationArtifact[];
  context: AnalysisContext;
  /** Rules to run; defaults to the full registered set when omitted. */
  rules?: AnalyzerRule[];
}

/** Rules enabled for the current MVP build (grown across sprints). */
export const DEFAULT_RULES: AnalyzerRule[] = [
  duplicateRule,
  highStakesRule,
  largeFileRule,
  repetitionRule,
  scopedNoMatchRule,
];

/**
 * Runs all rules and returns an aggregated report. Rule failures are caught
 * and logged instead of failing the whole analysis.
 */
export async function analyze(input: AnalyzeInput): Promise<AnalysisReport> {
  const { artifacts, context, rules } = input;
  const ruleSet = rules ?? DEFAULT_RULES;

  const findings: Finding[] = [];

  for (const rule of ruleSet) {
    try {
      const result = await rule.run(artifacts, context);
      findings.push(...(Array.isArray(result) ? result : []));
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error(
        `[contextcheck] Analyzer rule '${rule.name}' failed:`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  return aggregate(artifacts, findings);
}

/** Builds the summary + report from artifacts and findings. */
export function aggregate(
  artifacts: ConfigurationArtifact[],
  findings: Finding[],
): AnalysisReport {
  const totalTokens = artifacts.reduce(
    (sum, a) => sum + a.metadata.estimatedTokens,
    0,
  );
  const skills = artifacts.filter((a) => a.type === "skill").length;

  // Potential Context Overhead is derived from the other findings (Spec §22).
  const contextOverhead = estimateOverhead(artifacts, findings);
  const overheadFinding = buildContextOverheadFinding(
    contextOverhead,
    findings.flatMap((f) => f.filePaths),
  );
  const allFindings = overheadFinding
    ? [...findings, overheadFinding]
    : findings;

  return {
    summary: {
      configurationFiles: artifacts.length,
      skills,
      estimatedTokens: totalTokens,
      potentialContextOverhead: contextOverhead,
    },
    artifacts,
    findings: allFindings,
  };
}
