/**
 * Finding model (Spec §12, §10).
 *
 * `type`, `label`, `severity` and `confidence` are distinct concepts:
 * - type: the technical reason a finding was produced
 * - label: the category shown to the user in the CLI
 * - severity: how important the finding is
 * - confidence: how reliable the detection method is
 *
 * The type -> label -> severity -> confidence mapping in the spec is
 * NORMATIVE (Rule 17). Analyzers must not invent new values (Rule 27).
 */

/** Technical cause of the finding. */
export type FindingType =
  | "duplicate"
  | "repetition"
  | "large-file"
  | "scoped-no-match"
  | "high-stakes"
  | "context-overhead";

/** Category shown in the CLI. */
export type FindingLabel = "INFO" | "CONTEXT" | "REVIEW" | "CAUTION";

/** Importance level. `warning` exists for future expansion only. */
export type FindingSeverity = "info" | "notice" | "warning";

/** Reliability of the detection method. */
export type FindingConfidence = "high" | "medium" | "low";

export interface Finding {
  id: string;
  type: FindingType;
  label: FindingLabel;
  severity: FindingSeverity;
  confidence: FindingConfidence;

  /** All files involved. Cross-file findings must list every path here. */
  filePaths: string[];

  title: string;
  description: string;
  recommendation?: string;
}
