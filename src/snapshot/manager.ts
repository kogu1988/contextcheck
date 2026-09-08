/**
 * Snapshot storage (Spec §29, §30).
 *
 * A snapshot is a privacy-safe record of the AI configuration discovered in a
 * repo at a point in time. It stores only path/type/scope/metadata — never raw
 * content — so snapshots are safe to persist locally and share.
 *
 * Snapshots are stored as JSON files under `.contextcheck/snapshots/`.
 */

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";

import type { ConfigurationArtifact } from "../types/configuration.js";
import type { Finding } from "../types/finding.js";
import { toArtifactJson } from "../output/json.js";

export const SNAPSHOT_DIR = ".contextcheck/snapshots";
export const SNAPSHOT_EXTENSION = ".json";

export interface SnapshotEntry {
  id: string;
  type: ConfigurationArtifact["type"];
  path: string;
  scope?: ConfigurationArtifact["scope"];
  metadata: ConfigurationArtifact["metadata"];
}

export interface Snapshot {
  id: string;
  createdAt: string;
  configurationFiles: number;
  skills: number;
  estimatedTokens: number;
  artifacts: SnapshotEntry[];
  /** Analysis findings at snapshot time. Optional for backward compatibility. */
  findings?: Finding[];
}

/** Builds a snapshot from a discovery result + findings (content excluded). */
export function buildSnapshot(
  artifacts: ConfigurationArtifact[],
  findings: Finding[] = [],
): Snapshot {
  const entries: SnapshotEntry[] = artifacts.map((a) => toArtifactJson(a));
  const createdAt = new Date().toISOString();

  return {
    id: snapshotId(createdAt),
    createdAt,
    configurationFiles: artifacts.length,
    skills: artifacts.filter((a) => a.type === "skill").length,
    estimatedTokens: artifacts.reduce(
      (sum, a) => sum + a.metadata.estimatedTokens,
      0,
    ),
    artifacts: entries,
    findings,
  };
}

/** Stable filename-friendly id derived from the creation timestamp. */
export function snapshotId(createdAt: string): string {
  const base = createdAt.replace(/[:.]/g, "-");
  return `snap_${createHash("sha1").update(createdAt).digest("hex").slice(0, 6)}_${base}`;
}

/** Resolves the snapshots directory for a repo root. */
export function snapshotsDir(rootPath: string): string {
  return join(rootPath, SNAPSHOT_DIR);
}

/** Persists a snapshot to `.contextcheck/snapshots/<id>.json`. */
export async function saveSnapshot(
  rootPath: string,
  snapshot: Snapshot,
): Promise<string> {
  const dir = snapshotsDir(rootPath);
  await mkdir(dir, { recursive: true });
  const file = join(dir, `${snapshot.id}${SNAPSHOT_EXTENSION}`);
  await writeFile(file, JSON.stringify(snapshot, null, 2), "utf8");
  return file;
}

/** Loads a single snapshot by file path. Throws if invalid. */
export async function loadSnapshotFile(filePath: string): Promise<Snapshot> {
  const text = await readFile(filePath, "utf8");
  const parsed = JSON.parse(text) as Snapshot;
  if (!parsed.id || !Array.isArray(parsed.artifacts)) {
    throw new Error(`Invalid snapshot: ${filePath}`);
  }
  return parsed;
}

/**
 * Extracts the sortable timestamp portion from a snapshot filename. Ids are
 * `snap_<hash>_<timestamp>`; the hash sorts before the timestamp, so sorting
 * by full filename is NOT chronological. The trailing ISO-like timestamp is.
 */
function snapshotTimestampKey(filename: string): string {
  const idx = filename.lastIndexOf("_");
  return idx === -1 ? filename : filename.slice(idx + 1);
}

/** Lists snapshot file paths, newest last. Returns [] when none exist. */
export async function listSnapshotFiles(rootPath: string): Promise<string[]> {
  const dir = snapshotsDir(rootPath);
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }
  return names
    .filter((n) => n.endsWith(SNAPSHOT_EXTENSION))
    .sort((a, b) =>
      snapshotTimestampKey(a).localeCompare(snapshotTimestampKey(b)),
    )
    .map((n) => join(dir, n));
}

/** Returns the most recently created snapshot file path, if any. */
export async function latestSnapshotFile(
  rootPath: string,
): Promise<string | null> {
  const files = await listSnapshotFiles(rootPath);
  if (files.length === 0) return null;
  // Sorted newest last by embedded timestamp.
  return files[files.length - 1] ?? null;
}
