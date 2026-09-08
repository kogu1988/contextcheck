/**
 * Severity threshold / exit-code semantics for CI (Spec §11, §34; product
 * decision 2026).
 *
 * `--fail-on` consumes a severity level; a finding at or above the threshold
 * causes a non-zero exit. Default (no `--fail-on`) is informational: findings
 * never fail CI on their own.
 *
 * Ranking: info (0) < notice (1) < warning (2).
 *
 * Label→severity mapping (normative, Spec §10):
 *   INFO → info, CONTEXT → info, REVIEW → notice, CAUTION → notice.
 */

import type { Finding, FindingSeverity } from "../types/finding.js";

/** Accepted `--fail-on` values (severity level). */
export type FailThreshold = FindingSeverity;

const SEVERITY_RANK: Record<FindingSeverity, number> = {
  info: 0,
  notice: 1,
  warning: 2,
};

/** Whether any finding meets or exceeds the threshold. */
export function shouldFailOnSeverity(
  findings: Finding[],
  threshold: FailThreshold,
): boolean {
  const min = SEVERITY_RANK[threshold];
  return findings.some((f) => SEVERITY_RANK[f.severity] >= min);
}

/** Highest severity present in a set of findings, or "info" when empty. */
export function maxSeverity(findings: Finding[]): FindingSeverity {
  let rank = 0;
  let sev: FindingSeverity = "info";
  for (const f of findings) {
    if (SEVERITY_RANK[f.severity] > rank) {
      rank = SEVERITY_RANK[f.severity];
      sev = f.severity;
    }
  }
  return sev;
}

export function isValidFailThreshold(value: string): value is FailThreshold {
  return value === "info" || value === "notice" || value === "warning";
}
