/**
 * Local project registry (user-level, no database / cloud / telemetry).
 *
 * Stores a JSON file in the OS application/config directory rather than inside
 * each repository. Registry entries never include repository URLs, source
 * code, instruction content, or Git remotes — they store only a local id,
 * name, path and addedAt timestamp.
 *
 * The registry path is injectable so tests stay hermetic (no real user home).
 */

import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

import { canonicalProjectKey, normalizeProjectPath } from "./paths.js";

export const REGISTRY_VERSION = 1;

export interface ProjectEntry {
  id: string;
  name: string;
  path: string;
  addedAt: string;
}

export interface RegistryFile {
  version: number;
  projects: ProjectEntry[];
}

/** Resolves the directory that holds the user-level registry. */
export function registryDir(
  home: string = homedir(),
  platform: NodeJS.Platform = process.platform,
): string {
  if (platform === "win32") {
    // %APPDATA%\contextcheck (Windows-native convention).
    return join(
      process.env.APPDATA ?? join(home, "AppData", "Roaming"),
      "contextcheck",
    );
  }
  // ~/.config/contextcheck (XDG-style).
  return join(home, ".config", "contextcheck");
}

/** Default registry file path. */
export function registryPath(baseDir?: string): string {
  return join(baseDir ?? registryDir(), "projects.json");
}

/** Generates a short, local-only project id (never derived from URLs). */
export function generateProjectId(): string {
  return `proj_${randomBytes(5).toString("hex")}`;
}

/** An empty registry file. */
export function emptyRegistry(): RegistryFile {
  return { version: REGISTRY_VERSION, projects: [] };
}

/** Loads the registry, returning an empty one when missing/corrupted. */
export async function loadRegistry(baseDir?: string): Promise<RegistryFile> {
  const file = registryPath(baseDir);
  try {
    const text = await readFile(file, "utf8");
    const parsed = JSON.parse(text) as RegistryFile;
    if (!Array.isArray(parsed.projects)) return emptyRegistry();
    return parsed;
  } catch {
    // Missing or corrupted registry -> start clean (do not fail CLI).
    return emptyRegistry();
  }
}

/** Persists the registry. Creates the directory if needed. */
export async function saveRegistry(
  registry: RegistryFile,
  baseDir?: string,
): Promise<void> {
  const file = registryPath(baseDir);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(registry, null, 2), "utf8");
}

/** Returns any entry whose canonical key matches the given path. */
export function find(
  registry: RegistryFile,
  path: string,
  cwd: string = process.cwd(),
): ProjectEntry | undefined {
  const key = canonicalProjectKey(path, cwd);
  return registry.projects.find((p) => canonicalProjectKey(p.path) === key);
}

/**
 * Adds a project to the registry. Returns `{ added: false }` when it already
 * exists (duplicate), or pushes a new entry and returns it.
 */
export async function addProject(
  registry: RegistryFile,
  path: string,
  name?: string,
  cwd: string = process.cwd(),
): Promise<{ added: boolean; entry?: ProjectEntry }> {
  const normalized = normalizeProjectPath(path, cwd);
  const existing = find(registry, path, cwd);
  if (existing) return { added: false };

  const entry: ProjectEntry = {
    id: generateProjectId(),
    name: name ?? projectNameFromPath(normalized),
    path: displayPath(normalized),
    addedAt: new Date().toISOString(),
  };
  registry.projects.push(entry);
  return { added: true, entry };
}

/** Removes an entry by id or by path. Returns true when removed. */
export function removeProject(
  registry: RegistryFile,
  ref: string,
  cwd: string = process.cwd(),
): boolean {
  const before = registry.projects.length;
  const key = canonicalProjectKey(ref, cwd);
  registry.projects = registry.projects.filter(
    (p) => p.id !== ref && canonicalProjectKey(p.path) !== key,
  );
  return registry.projects.length < before;
}

/** Project name derived from the path's final segment. */
export function projectNameFromPath(path: string): string {
  const seg = path.split(/[\\/]/).filter(Boolean);
  return seg[seg.length - 1] ?? path;
}

/** Display normalization for stored paths. */
export function displayPath(path: string): string {
  // Reuse the normalizer; on Windows this yields backslash paths.
  return normalizeProjectPath(path);
}
