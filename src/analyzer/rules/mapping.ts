/**
 * Finding factory + normative type/label/severity/confidence mapping
 * (Spec §10, §13, Rule 17, Rule 27).
 *
 * Analyzers must never invent their own `label`, `severity` or `confidence`
 * values. This mapping is the single source of truth; a rule only supplies a
 * `type` and the factory resolves the public fields.
 */

import { createHash } from "node:crypto";

import type {
  Finding,
  FindingConfidence,
  FindingLabel,
  FindingSeverity,
  FindingType,
} from "../../types/finding.js";

export interface FindingSpec {
  type: FindingType;
  filePaths: string[];
  title: string;
  description: string;
  recommendation?: string;
}

interface NormativeMeta {
  label: FindingLabel;
  severity: FindingSeverity;
  confidence: FindingConfidence;
}

/** Normative mapping (Spec §10 table). */
export const NORMATIVE_MAPPING: Record<FindingType, NormativeMeta> = {
  duplicate: { label: "INFO", severity: "info", confidence: "high" },
  repetition: { label: "INFO", severity: "info", confidence: "medium" },
  "large-file": { label: "CONTEXT", severity: "info", confidence: "high" },
  "scoped-no-match": {
    label: "REVIEW",
    severity: "notice",
    confidence: "medium",
  },
  "high-stakes": { label: "CAUTION", severity: "notice", confidence: "medium" },
  "context-overhead": {
    label: "CONTEXT",
    severity: "info",
    confidence: "medium",
  },
};

/**
 * Produces a fully-populated Finding with a deterministic id and the
 * normative label/severity/confidence resolved from `type`.
 */
export function makeFinding(spec: FindingSpec): Finding {
  const meta = NORMATIVE_MAPPING[spec.type];
  const id = findingId(spec.type, spec.filePaths, spec.title);
  return {
    id,
    type: spec.type,
    label: meta.label,
    severity: meta.severity,
    confidence: meta.confidence,
    filePaths: [...spec.filePaths],
    title: spec.title,
    description: spec.description,
    recommendation: spec.recommendation,
  };
}

/** Deterministic id from type + paths + title. */
function findingId(
  type: FindingType,
  filePaths: string[],
  title: string,
): string {
  const key = `${type}::${[...filePaths].sort().join(",")}::${title}`;
  return `finding_${createHash("sha1").update(key).digest("hex").slice(0, 8)}`;
}
