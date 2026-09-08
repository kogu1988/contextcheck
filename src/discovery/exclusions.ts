/**
 * Discovery boundaries (Spec §15).
 *
 * These directories are never scanned by default. The goal is to avoid
 * finding third-party dependency configuration, generated output and to keep
 * filesystem traversal fast.
 */

import { posix } from "node:path";

/** Directories skipped during recursive discovery. */
export const EXCLUDED_DIRECTORIES: readonly string[] = [
  ".git",
  ".contextcheck",
  "node_modules",
  "vendor",
  "dist",
  "build",
  ".next",
  "out",
  "coverage",
  ".cache",
  "tmp",
  "temp",
];

/**
 * Returns whether the given path segment is an excluded directory name.
 * Comparisons are case-insensitive and match at any directory level.
 */
export function isExcludedDirectory(segment: string): boolean {
  const lower = segment.toLowerCase();
  return EXCLUDED_DIRECTORIES.includes(lower);
}

/**
 * Returns whether an absolute/relative path (posix-normalized) traverses any
 * excluded directory segment. Used as a second guard for exact matches.
 */
export function traversesExcludedDirectory(filePath: string): boolean {
  const parts = posix.normalize(filePath).split("/");
  return parts.some((part) => isExcludedDirectory(part));
}
