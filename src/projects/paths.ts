/**
 * Project path normalization (Windows-aware).
 *
 * The primary development environment is Windows, so path handling must
 * handle drive letters, backslash/forward-slash separators, trailing
 * separators, `.` / `..`, relative paths, and case-insensitive comparison
 * without assuming Unix behavior.
 *
 * We normalize for display but compute a canonical key for dedup so that:
 *   C:\Projects\PetPal
 *   C:\Projects\PetPal\
 *   C:\Projects\Foo\..\PetPal
 * all resolve to the same project.
 */

import { existsSync } from "node:fs";
import { isAbsolute, normalize, resolve } from "node:path";

/** Whether the current platform compares paths case-insensitively (Windows). */
export function isCaseInsensitivePlatform(): boolean {
  return process.platform === "win32";
}

/**
 * Normalizes a user-supplied path to an absolute, normalized filesystem path.
 * Relative paths are resolved against `cwd`. Does NOT require the path to
 * exist. Trailing separators are removed except for a drive root (`C:\`).
 */
export function normalizeProjectPath(
  input: string,
  cwd: string = process.cwd(),
): string {
  const trimmed = input.trim();
  if (trimmed.length === 0) throw new Error("Path cannot be empty.");

  // Resolve relative to cwd. `path.resolve` already handles `.`/`..` and
  // drive-letter/UNC detection on Windows.
  const abs = isAbsolute(trimmed) ? normalize(trimmed) : resolve(cwd, trimmed);

  // Remove trailing separators, but keep a drive root like `C:\`.
  const rootOf = abs.match(/^([A-Za-z]:[\\/]|\\\\)/)?.[0];
  if (abs.length > (rootOf?.length ?? 0) && /[\\/]$/.test(abs)) {
    return abs.replace(/[\\/]+$/, "");
  }
  return abs;
}

/**
 * Canonical identity for duplicate detection.
 * - resolution + normalization
 * - trailing-separator removal
 * - on Windows, lowercased (case-insensitive comparison)
 */
export function canonicalProjectKey(
  path: string,
  cwd: string = process.cwd(),
): string {
  const abs = normalizeProjectPath(path, cwd);
  return isCaseInsensitivePlatform() ? abs.toLowerCase() : abs;
}

/** Produces a display path (e.g. `C:\Projects\PetPal`). */
export function displayPath(path: string): string {
  // On Windows, normalize to backslashes for display (path.normalize does this).
  return normalize(path);
}

/** Returns a friendly project name from a path's final segment. */
export function nameFromPath(path: string): string {
  const abs = normalizeProjectPath(path);
  const seg = abs.split(/[\\/]/).filter(Boolean);
  return seg[seg.length - 1] ?? abs;
}

/** Whether a directory exists on disk. */
export function pathExists(path: string): boolean {
  return existsSync(path);
}
