/**
 * Diff calculation (Spec §30).
 *
 * Compares two snapshots (or a snapshot against the current discovery) and
 * reports per-file token changes, new/removed files and the total context
 * delta. It is an AI-configuration-specific view over versioned snapshots —
 * it does not recreate Git (Spec §31).
 */

import type { Snapshot, SnapshotEntry } from "./manager.js";

export interface FileDiff {
  path: string;
  beforeTokens: number;
  afterTokens: number;
  delta: number;
  status: "added" | "removed" | "changed" | "unchanged";
}

export interface SnapshotDiff {
  beforeTokens: number;
  afterTokens: number;
  delta: number;
  files: FileDiff[];
  addedFiles: string[];
  removedFiles: string[];
}

interface TokenMap {
  [path: string]: SnapshotEntry;
}

function toTokenMap(artifacts: SnapshotEntry[]): TokenMap {
  const map: TokenMap = {};
  for (const a of artifacts) map[a.path] = a;
  return map;
}

/** Computes a diff between an older and a newer artifact set. */
export function diffSnapshots(
  before: SnapshotEntry[],
  after: SnapshotEntry[],
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

  const beforeTokens = sum(before);
  const afterTokens = sum(after);

  return {
    beforeTokens,
    afterTokens,
    delta: afterTokens - beforeTokens,
    files,
    addedFiles: files.filter((f) => f.status === "added").map((f) => f.path),
    removedFiles: files
      .filter((f) => f.status === "removed")
      .map((f) => f.path),
  };
}

function sum(artifacts: SnapshotEntry[]): number {
  return artifacts.reduce((s, a) => s + a.metadata.estimatedTokens, 0);
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
  return diffSnapshots(before.artifacts, after.artifacts);
}
