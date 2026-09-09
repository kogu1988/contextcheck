import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  assessGitHistory,
  isShallowRepository,
} from "../src/git/sufficiency.js";
import {
  commitFile,
  commitFileDated,
  initGitRepo,
  markShallow,
  type TestGitRepo,
} from "./helpers/git.js";

describe("Git history sufficiency — real repos (Spec §24, Rule 26)", () => {
  let repo: TestGitRepo;

  afterEach(() => {
    repo?.cleanup();
  });

  it("detects a shallow clone via .git/shallow (Rule 26)", async () => {
    repo = initGitRepo();
    commitFile(repo.root, "CLAUDE.md", "rules\n", "init");
    markShallow(repo.root);

    expect(isShallowRepository(repo.root)).toBe(true);
    const result = await assessGitHistory(repo.root, 90);
    expect(result.isShallow).toBe(true);
    expect(result.sufficient).toBe(false);
  });

  it("treats history that spans beyond the window as sufficient", async () => {
    repo = initGitRepo();
    // Commit 200 days ago (outside the 90-day window) plus a recent one, so the
    // total history is longer than the window and there is recent activity.
    commitFileDated(
      repo.root,
      "CLAUDE.md",
      "# old\n",
      "old",
      new Date(Date.now() - 200 * 86400000).toISOString(),
    );
    commitFile(repo.root, "AGENTS.md", "# recent\n", "recent");

    const result = await assessGitHistory(repo.root, 90);
    expect(result.isGitRepo).toBe(true);
    expect(result.isShallow).toBe(false);
    expect(result.totalCommitCount).toBe(2);
    expect(result.windowCommitCount).toBe(1);
    expect(result.sufficient).toBe(true);
  });

  it("treats history shorter than the window as insufficient", async () => {
    repo = initGitRepo();
    // Commit 200 days ago: outside a 90-day window, and it's the only commit.
    commitFileDated(
      repo.root,
      "CLAUDE.md",
      "# rules\n",
      "old",
      new Date(Date.now() - 200 * 86400000).toISOString(),
    );

    const result = await assessGitHistory(repo.root, 90);
    // Only an old commit exists -> no activity within the window -> insufficient.
    expect(result.sufficient).toBe(false);
    expect(result.windowCommitCount).toBe(0);
  });

  it("returns sufficient=false when not a git repository", async () => {
    const nongit = mkdtempSync(join(tmpdir(), "cc-nongit-"));
    try {
      expect((await assessGitHistory(nongit, 90)).sufficient).toBe(false);
    } finally {
      rmSync(nongit, { recursive: true, force: true });
    }
  });
});
