/**
 * Likely-project detection (no recursive crawl).
 *
 * Scans immediate child directories of a user-selected parent and marks a
 * child as a likely project when it contains a recognizable project manifest
 * or `.git`. Junk directories (node_modules, dist, build, caches, Downloads,
 * Documents, temp) are never considered candidates.
 */

import { existsSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

import { pathExists } from "./paths.js";

/** Recognizable project manifest filenames (file must exist to count). */
export const PROJECT_SIGNALS: readonly string[] = [
  ".git",
  "package.json",
  "pyproject.toml",
  "Cargo.toml",
  "go.mod",
  "pom.xml",
  "build.gradle",
  "composer.json",
];

/** Directories never treated as project candidates. */
export const EXCLUDED_DIR_NAMES: readonly string[] = [
  "node_modules",
  "vendor",
  "dist",
  "build",
  "out",
  ".next",
  ".cache",
  "tmp",
  "temp",
  "coverage",
  "Downloads",
  "Documents",
  "Desktop",
  "AppData",
  ".git",
];

function isExcluded(name: string): boolean {
  const lower = name.toLowerCase();
  return EXCLUDED_DIR_NAMES.includes(lower);
}

/** Returns true when a directory is a likely project (has a known signal). */
export async function isLikelyProject(dirPath: string): Promise<boolean> {
  if (!pathExists(dirPath)) return false;
  for (const signal of PROJECT_SIGNALS) {
    if (existsSync(join(dirPath, signal))) return true;
  }
  return false;
}

export interface ProjectCandidate {
  path: string;
  name: string;
  /** Signal that made it a candidate (for reporting/debugging). */
  signal?: string;
}

/**
 * Lists likely child projects of `parentPath` (immediate children only).
 * Never recurses. Returns candidates sorted by name; failed-permission or
 * non-directory entries are skipped silently.
 */
export async function findLikelyProjects(
  parentPath: string,
): Promise<ProjectCandidate[]> {
  if (!pathExists(parentPath)) return [];

  let entries: string[];
  try {
    entries = await readdir(parentPath);
  } catch {
    return [];
  }

  const candidates: ProjectCandidate[] = [];
  for (const name of entries) {
    if (isExcluded(name)) continue;
    const child = join(parentPath, name);
    try {
      const s = await stat(child);
      if (!s.isDirectory()) continue;
    } catch {
      continue;
    }
    if (await isLikelyProject(child)) {
      candidates.push({ path: child, name, signal: await firstSignal(child) });
    }
  }
  return candidates.sort((a, b) => a.name.localeCompare(b.name));
}

async function firstSignal(dir: string): Promise<string | undefined> {
  for (const s of PROJECT_SIGNALS) {
    if (existsSync(join(dir, s))) return s;
  }
  return undefined;
}
