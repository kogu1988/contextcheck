/**
 * Diff calculation (Spec §30) — Snapshot/Diff v1.
 *
 * Compares two snapshots (or a snapshot against current state) and reports:
 *  - per-file artifact changes (added / removed / modified)
 *  - total context token delta
 *  - analysis finding changes (added / resolved / changed)
 *
 * The value proposition is that a ContextCheck diff answers "the context layer
 * changed, and as a result which analysis findings appeared / disappeared?"
 * — NOT causal claims about model performance (Spec §28, Rule 28).
 */

import type { Finding, FindingType } from "../types/finding.js";
import type { Snapshot, SnapshotEntry } from "./manager.js";

export interface FileDiff {
  path: string;
  beforeTokens: number;
  afterTokens: number;
  delta: number;
  status: "added" | "removed" | "changed" | "unchanged";
}

export type FindingChangeStatus = "added" | "removed" | "changed" | "unchanged";

export interface FindingChange {
  id: string;
  type: FindingType;
  status: FindingChangeStatus;
  title: string;
  filePaths: string[];
}

export interface FindingChangesSummary {
  added: number;
  removed: number;
  changed: number;
  unchanged: number;
}

export interface SnapshotDiff {
  beforeTokens: number;
  afterTokens: number;
  delta: number;
  files: FileDiff[];
  addedFiles: string[];
  removedFiles: string[];
  findings: FindingChange[];
  findingChanges: FindingChangesSummary;
}

interface TokenMap {
  [path: string]: SnapshotEntry;
}

function toTokenMap(artifacts: SnapshotEntry[]): TokenMap {
  const map: TokenMap = {};
  for (const a of artifacts) map[a.path] = a;
  return map;
}

/**
 * Computes a diff between an older and a newer artifact set, plus analysis
 * finding changes when finding arrays are supplied. Findings are optional so
 * diffs against legacy snapshots (no stored findings) still work.
 */
export function diffSnapshots(
  before: SnapshotEntry[],
  after: SnapshotEntry[],
  beforeFindings?: readonly Finding[],
  afterFindings?: readonly Finding[],
): SnapshotDiff {
  const beforeMap = toTokenMap(before);
  const afterMap = toTokenMap(after);

  const allPaths = [
    ...new Set([...Object.keys(beforeMap), ...Object.keys(afterMap)]),
  ].sort();
  const files: FileDiff[] = [];

  for (const path of allPaths) {
    const b = beforeMap[path];
    const a = afterMap[path];
    const beforeTokens = b?.metadata.estimatedTokens ?? 0;
    const afterTokens = a?.metadata.estimatedTokens ?? 0;

    let status: FileDiff["status"];
    if (!b && a) status = "added";
    else if (b && !a) status = "removed";
    else if (beforeTokens !== afterTokens) status = "changed";
    else status = "unchanged";

    files.push({
      path,
      beforeTokens,
      afterTokens,
      delta: afterTokens - beforeTokens,
      status,
    });
  }

  const beforeTokens = sumTokens(before);
  const afterTokens = sumTokens(after);

  const findingChanges = findFindingChanges(
    beforeFindings ?? [],
    afterFindings ?? [],
  );

  return {
    beforeTokens,
    afterTokens,
    delta: afterTokens - beforeTokens,
    files,
    addedFiles: files.filter((f) => f.status === "added").map((f) => f.path),
    removedFiles: files
      .filter((f) => f.status === "removed")
      .map((f) => f.path),
    findings: findingChanges,
    findingChanges: summarizeFindingChanges(findingChanges),
  };
}

function sumTokens(artifacts: SnapshotEntry[]): number {
  return artifacts.reduce((s, a) => s + a.metadata.estimatedTokens, 0);
}

/**
 * Finds finding changes between two artifact sets. Findings come from the
 * stored snapshots (which now persist analysis findings alongside artifacts).
 * Backward compatible: treats missing findings as an empty list.
 *
 * Finding identity: `id` (deterministic by type+paths+title).
 */
export function findFindingChanges(
  before: readonly Finding[],
  after: readonly Finding[],
): FindingChange[] {
  const beforeById = new Map(before.map((f) => [f.id, f]));
  const afterById = new Map(after.map((f) => [f.id, f]));
  const ids = new Set([...beforeById.keys(), ...afterById.keys()]);

  const changes: FindingChange[] = [];

  for (const id of ids) {
    const b = beforeById.get(id);
    const a = afterById.get(id);
    if (a && !b) changes.push(toChange(a, "added"));
    else if (b && !a) changes.push(toChange(b, "removed"));
    else if (a) changes.push(toChange(a, "unchanged"));
  }

  // Pair an added and a removed finding that share the same logical identity
  // (type + file paths) but different id (title/text changed) as "changed".
  const key = (c: FindingChange) =>
    `${c.type}::${[...c.filePaths].sort().join(",")}`;
  const byKey = new Map<string, FindingChange[]>();
  for (const c of changes) {
    const k = key(c);
    const list = byKey.get(k) ?? [];
    list.push(c);
    byKey.set(k, list);
  }

  for (const group of byKey.values()) {
    const added = group.filter((c) => c.status === "added");
    const removed = group.filter((c) => c.status === "removed");
    while (added.length > 0 && removed.length > 0) {
      const a = added.shift()!;
      const r = removed.shift()!;
      const idx = changes.indexOf(r);
      if (idx !== -1) changes.splice(idx, 1);
      a.status = "changed";
    }
  }

  return changes.sort((x, y) => x.status.localeCompare(y.status));
}

function toChange(f: Finding, status: FindingChangeStatus): FindingChange {
  return {
    id: f.id,
    type: f.type,
    status,
    title: f.title,
    filePaths: f.filePaths,
  };
}

function summarizeFindingChanges(
  changes: FindingChange[],
): FindingChangesSummary {
  const summary: FindingChangesSummary = {
    added: 0,
    removed: 0,
    changed: 0,
    unchanged: 0,
  };
  for (const c of changes) summary[c.status] += 1;
  return summary;
}

/** Formats a token count with thousands separators for display. */
export function formatTokens(tokens: number): string {
  return Math.round(tokens).toLocaleString("en-US");
}

// Convenience: full snapshot-level diff.
export function diffBetweenSnapshots(
  before: Snapshot,
  after: Snapshot,
): SnapshotDiff {
  return diffSnapshots(
    before.artifacts,
    after.artifacts,
    before.findings ?? [],
    after.findings ?? [],
  );
}
