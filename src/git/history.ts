/**
 * Changed files over a Git window (Spec §23, §24, §31).
 *
 * Used to check whether a scoped rule's glob patterns ever matched a file
 * change. Only metadata is read — never configuration content — keeping the
 * "AI configuration-specific view over Git" role (Spec §31).
 */

import { runGit, type GitRunner } from "./sufficiency.js";

/**
 * Returns the set of unique file paths changed within `winDays`, relative to
 * the repo root (posix-normalized). Throws if git fails; callers gate this on
 * history sufficiency first.
 */
export async function changedFilesInWindow(
  rootPath: string,
  windowDays: number,
  run: GitRunner = runGit,
): Promise<string[]> {
  const since = new Date(
    Date.now() - windowDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  const output = await run(rootPath, [
    "log",
    `--since=${since}`,
    "--name-only",
    "--pretty=format:",
    "HEAD",
  ]);

  const names = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return [...new Set(names)];
}

/**
 * Returns whether any changed file path matches a glob pattern relative to the
 * repo root. Used by scoped-rule matching (Spec §23).
 */
export function matchesChangedFile(
  pattern: string,
  changedPaths: string[],
): boolean {
  return changedPaths.some((p) => globMatch(pattern, p));
}

/**
 * Minimal glob matcher for the MVP: supports `**` (multi-segment), `*`
 * (within a segment) and exact/prefix matches. Not a full minimatch — enough
 * for deterministic scoped-rule matching.
 */
export function globMatch(pattern: string, path: string): boolean {
  const p = pattern.replace(/^\.\//, "").toLowerCase();
  const t = path.toLowerCase();

  if (p === t) return true;

  // Fast path: directory prefix pattern.
  if (!containsGlob(p)) {
    return t.startsWith(p.endsWith("/") ? p : `${p}/`);
  }

  const regex = globToRegExp(p);
  return regex.test(t);
}

function containsGlob(s: string): boolean {
  return s.includes("*") || s.includes("?") || s.includes("[");
}

/** Placeholder protecting a segment before the `*`/`.` replacements run. */
const SEGMENT = "\u0000";

function globToRegExp(glob: string): RegExp {
  // Protect `**/` first so it cannot be rewritten by later `*`/`.` passes.
  let out = glob.replace(/\*\*\//g, SEGMENT);
  // Escape regex literals, leaving `*` and `?` (and SEGMENT) intact.
  out = out.replace(/[.+^${}()|[\]]/g, "\\$&");
  // Multi-segment `**` and single-segment `*`.
  out = out.replace(/\*\*/g, ".*");
  out = out.replace(/\*/g, "[^/]*");
  out = out.replace(/\?/g, "[^/]");
  // Restore `**/` as an optional zero-or-more path prefix.
  out = out.replace(new RegExp(SEGMENT, "g"), "(?:.*/)?");
  return new RegExp(`^${out}$`);
}
