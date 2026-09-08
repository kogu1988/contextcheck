/**
 * Git history sufficiency (Spec §24, Rule 18, Rule 26).
 *
 * Scoped-rule activity analysis MUST be skipped when Git history is
 * insufficient. If we only have a short sample, a "no match" is not evidence
 * that a rule is unused — so we never emit `scoped-no-match`.
 *
 * Insufficient when ANY of:
 *   1. No Git repository present.
 *   2. Repository is a shallow clone (`.git/shallow` exists).
 *   3. There are no commits within the analysis window.
 *   4. Total history is shorter than the window.
 *   5. History cannot be analyzed (e.g. git unavailable).
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface GitSufficiencyResult {
  isGitRepo: boolean;
  isShallow: boolean;
  /** Commits within the window. */
  windowCommitCount: number;
  /** Total commits across all history. */
  totalCommitCount: number;
  sufficient: boolean;
}

/** Checks for a shallow clone using the presence of `.git/shallow` (Rule 26). */
export function isShallowRepository(rootPath: string): boolean {
  return existsSync(join(rootPath, ".git", "shallow"));
}

/**
 * Runs a git command, returning stdout. Throws if git fails; callers decide
 * how to degrade.
 */
export async function runGit(
  rootPath: string,
  args: string[],
): Promise<string> {
  const { stdout } = await execAsync(`git ${args.join(" ")}`, {
    cwd: rootPath,
    maxBuffer: 8 * 1024 * 1024,
  });
  return stdout.trim();
}

/** Optional injected runner to keep tests hermetic. */
export type GitRunner = (rootPath: string, args: string[]) => Promise<string>;

/**
 * Determines whether there is enough git history to reason about scoped-rule
 * activity within `windowDays`. Never throws; degrades to `sufficient:false`
 * on any error (Spec §24 case 4).
 */
export async function assessGitHistory(
  rootPath: string,
  windowDays: number,
  run: GitRunner = runGit,
): Promise<GitSufficiencyResult> {
  const since = new Date(
    Date.now() - windowDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const fallback = (
    partial: Partial<GitSufficiencyResult>,
  ): GitSufficiencyResult => ({
    isGitRepo: false,
    isShallow: false,
    windowCommitCount: 0,
    totalCommitCount: 0,
    sufficient: false,
    ...partial,
  });

  // 1. Repository present?
  let isRepo = false;
  try {
    const head = await run(rootPath, ["rev-parse", "--is-inside-work-tree"]);
    isRepo = head === "true";
  } catch {
    return fallback({ isGitRepo: false });
  }

  if (!isRepo) {
    return fallback({ isGitRepo: false });
  }

  // 2. Shallow clone?
  const isShallow = isShallowRepository(rootPath);
  if (isShallow) {
    return fallback({ isGitRepo: true, isShallow: true });
  }

  // 3 & 4. Commit counts.
  try {
    const total =
      parseInt(
        (await run(rootPath, ["rev-list", "--count", "HEAD"])) || "0",
        10,
      ) || 0;
    const window =
      parseInt(
        (await run(rootPath, [
          "rev-list",
          "--count",
          `--since=${since}`,
          "HEAD",
        ])) || "0",
        10,
      ) || 0;

    // If there is any history but none within the window, or the window count
    // equals total count (history shorter than the window), treat as
    // insufficient — absence of recent activity is not evidence.
    if (total === 0 || window === 0 || window >= total) {
      return fallback({
        isGitRepo: true,
        totalCommitCount: total,
        windowCommitCount: window,
      });
    }

    return {
      isGitRepo: true,
      isShallow: false,
      windowCommitCount: window,
      totalCommitCount: total,
      sufficient: true,
    };
  } catch {
    return fallback({ isGitRepo: true });
  }
}
