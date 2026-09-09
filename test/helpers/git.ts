/**
 * Hermetic Git test helpers.
 *
 * Creates real temp Git repositories (init -> commit) so `git`-dependent code
 * in `src/git/**` is exercised against real binaries, without network.
 *
 * A "shallow" repo is created by writing a `.git/shallow` file manually — the
 * MVP detects shallow clones purely by that file's presence (Rule 26), so an
 * actual `--depth` clone (which needs a remote) is unnecessary here.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface TestGitRepo {
  root: string;
  cleanup(): void;
}

function run(root: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: root,
    stdio: ["ignore", "pipe", "inherit"],
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "test",
      GIT_AUTHOR_EMAIL: "t@t",
      GIT_COMMITTER_NAME: "test",
      GIT_COMMITTER_EMAIL: "t@t",
    },
  })
    .toString()
    .trim();
}

export function initGitRepo(): TestGitRepo {
  const root = mkdtempSync(join(tmpdir(), "cc-git-"));

  try {
    run(root, ["init", "-b", "main"]);
  } catch {
    // Older git may not support -b; fall back and rename.
    run(root, ["init"]);
  }

  const cleanup = () => {
    try {
      rmSync(root, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  };

  return { root, cleanup };
}

export function commitFile(
  root: string,
  relPath: string,
  content: string,
  message: string,
): void {
  const abs = join(root, relPath);
  mkdirSync(join(root, relPath.split("/").slice(0, -1).join("/")), {
    recursive: true,
  });
  writeFileSync(abs, content);
  run(root, ["add", relPath]);
  run(root, ["commit", "-m", message]);
}

/** Marks a repo as a shallow clone by creating `.git/shallow` (Rule 26). */
export function markShallow(root: string): void {
  writeFileSync(
    join(root, ".git", "shallow"),
    "0000000000000000000000000000000000000000\n",
  );
}

/** Sets a commit date in the past so it falls outside the Git window. */
export function commitFileDated(
  root: string,
  relPath: string,
  content: string,
  message: string,
  isoDate: string,
): void {
  const abs = join(root, relPath);
  mkdirSync(join(root, relPath.split("/").slice(0, -1).join("/")), {
    recursive: true,
  });
  writeFileSync(abs, content);
  run(root, ["add", relPath]);
  // `git commit --date` only sets the author date; `rev-list --since` filters
  // by committer date, so set GIT_COMMITTER_DATE explicitly.
  execFileSync("git", ["commit", "-m", message, "--date", isoDate], {
    cwd: root,
    stdio: ["ignore", "pipe", "inherit"],
    env: {
      ...process.env,
      GIT_COMMITTER_DATE: isoDate,
      GIT_AUTHOR_DATE: isoDate,
      GIT_AUTHOR_NAME: "test",
      GIT_AUTHOR_EMAIL: "t@t",
      GIT_COMMITTER_NAME: "test",
      GIT_COMMITTER_EMAIL: "t@t",
    },
  });
}
