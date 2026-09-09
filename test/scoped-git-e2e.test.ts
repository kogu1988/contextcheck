import { afterEach, describe, expect, it } from "vitest";

import { runAnalyze } from "../src/analyzer/run.js";
import {
  commitFile,
  commitFileDated,
  initGitRepo,
  type TestGitRepo,
} from "./helpers/git.js";

describe("scoped-rule analysis — real Git repo (Spec §23, §25, Rule 18)", () => {
  let repo: TestGitRepo;

  afterEach(() => {
    repo?.cleanup();
  });

  it("flags a scoped rule with no matching changes when history is sufficient", async () => {
    repo = initGitRepo();
    const old = new Date(Date.now() - 200 * 86400000).toISOString();
    commitFileDated(repo.root, "CLAUDE.md", "# rules\n", "init", old);
    // Recent commit touching unrelated files -> window has recent activity.
    commitFile(repo.root, "src/index.ts", "export const x = 1;\n", "recent");
    const dbRule = ".cursor/rules/db.mdc";
    commitFile(
      repo.root,
      dbRule,
      "---\nglobs: [src/db/**]\n---\n# db\n",
      "db rule",
    );

    const { report, git } = await runAnalyze({ rootPath: repo.root });
    expect(git.sufficient).toBe(true);

    const scoped = report.findings.filter((f) => f.type === "scoped-no-match");
    // db rule globs `src/db/**` never matched a change -> one REVIEW finding.
    expect(scoped.some((f) => f.filePaths.includes(dbRule))).toBe(true);
  });

  it("does NOT flag a scoped rule whose pattern matched a change", async () => {
    repo = initGitRepo();
    const old = new Date(Date.now() - 200 * 86400000).toISOString();
    commitFileDated(repo.root, "CLAUDE.md", "# rules\n", "init", old);
    // A change that matches the rule's globs.
    const dbRule = ".cursor/rules/db.mdc";
    commitFile(
      repo.root,
      "src/db/schema.ts",
      "export const db = {};\n",
      "db change",
    );
    commitFile(
      repo.root,
      dbRule,
      "---\nglobs: [src/db/**]\n---\n# db\n",
      "db rule",
    );

    const { report } = await runAnalyze({ rootPath: repo.root });
    const scoped = report.findings.filter((f) => f.type === "scoped-no-match");
    expect(scoped.some((f) => f.filePaths.includes(dbRule))).toBe(false);
  });

  it("produces no scoped-no-match findings when history is insufficient (Rule 18)", async () => {
    repo = initGitRepo();
    // All activity within the window -> young repo -> insufficient history.
    commitFile(
      repo.root,
      ".cursor/rules/db.mdc",
      "---\nglobs: [src/db/**]\n---\n# db\n",
      "db",
    );
    commitFile(repo.root, "CLAUDE.md", "# rules\n", "init");

    const { report, git } = await runAnalyze({ rootPath: repo.root });
    expect(git.sufficient).toBe(false);
    expect(report.findings.filter((f) => f.type === "scoped-no-match")).toEqual(
      [],
    );
  });
});
