/**
 * Privacy-safe JSON output (Spec §32, §33; Rule 23, Rule 25).
 *
 * The public JSON model is a separate DTO from the internal
 * `ConfigurationArtifact`. The serializer NEVER emits raw `content`. This
 * guarantee is enforced structurally — the DTO has no `content` field to
 * serialize, so a future CI command cannot accidentally leak configuration
 * into logs (Spec §53).
 */

import type {
  ConfigurationArtifact,
  ConfigurationScope,
} from "../types/configuration.js";
import type { Finding } from "../types/finding.js";
import type { AnalysisReport } from "../types/report.js";
import type {
  FileDiff,
  FindingChange,
  FindingChangesSummary,
  SnapshotDiff,
} from "../snapshot/diff.js";
import type { Snapshot } from "../snapshot/manager.js";

/** Privacy-safe artifact DTO (Spec §33). */
export interface ArtifactJson {
  id: string;
  type: ConfigurationArtifact["type"];
  path: string;
  scope?: ConfigurationScope;
  metadata: ConfigurationArtifact["metadata"];
}

export interface AnalysisSummaryJson {
  configurationFiles: number;
  skills: number;
  estimatedTokens: number;
  potentialContextOverhead: number;
}

export interface ReportJson {
  summary: AnalysisSummaryJson;
  artifacts: ArtifactJson[];
  findings: Finding[];
}

/** Converts an internal artifact into its privacy-safe DTO. */
export function toArtifactJson(artifact: ConfigurationArtifact): ArtifactJson {
  return {
    id: artifact.id,
    type: artifact.type,
    path: artifact.path,
    scope: artifact.scope,
    metadata: artifact.metadata,
  };
}

/** Converts a full report into a privacy-safe JSON shape. */
export function toReportJson(report: AnalysisReport): ReportJson {
  return {
    summary: report.summary,
    artifacts: report.artifacts.map(toArtifactJson),
    findings: report.findings,
  };
}

/** Serializes a report as formatted, privacy-safe JSON. */
export function serializeReport(report: AnalysisReport): string {
  return JSON.stringify(toReportJson(report), null, 2);
}

/** Privacy-safe snapshot diff DTO for CI consumption. */
export interface DiffJson {
  before: {
    id: string | null;
    createdAt: string | null;
    tokens: number;
    files: number;
  };
  after: {
    tokens: number;
    files: number;
  };
  deltaTokens: number;
  files: FileDiff[];
  findingChanges: FindingChangesSummary;
  findings: FindingChange[];
}

/** Serializes a snapshot diff as privacy-safe JSON (no raw content). */
export function serializeDiff(
  diff: SnapshotDiff,
  before?: Snapshot | null,
): string {
  const dto: DiffJson = {
    before: {
      id: before?.id ?? null,
      createdAt: before?.createdAt ?? null,
      tokens: diff.beforeTokens,
      files: before?.artifacts.length ?? 0,
    },
    after: {
      tokens: diff.afterTokens,
      files: diff.files.filter((f) => f.status !== "removed").length,
    },
    deltaTokens: diff.delta,
    files: diff.files,
    findingChanges: diff.findingChanges,
    findings: diff.findings,
  };
  return JSON.stringify(dto, null, 2);
}
