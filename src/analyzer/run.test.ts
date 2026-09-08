import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runAnalyze } from "./run.js";

describe("runAnalyze (end-to-end)", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "cc-run-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("produces a report with duplicate, large-file and overhead findings", async () => {
    // ~15k chars => ~3.8k estimated tokens, well above the 2k large-file threshold.
    const body = "some repeated instruction line\n".repeat(700);
    await writeFile(join(root, "CLAUDE.md"), body);
    // Identical body -> duplicate; also large (est tokens high).
    await writeFile(join(root, "AGENTS.md"), body);

    const { report, git } = await runAnalyze({ rootPath: root });

    // No git repo here -> scoped analysis skipped, but analysis succeeds.
    expect(git.sufficient).toBe(false);

    const types = report.findings.map((f) => f.type);
    expect(types).toContain("duplicate");
    expect(types).toContain("large-file");
    expect(types).toContain("context-overhead");

    const dup = report.findings.find((f) => f.type === "duplicate")!;
    expect(dup.filePaths).toEqual(["AGENTS.md", "CLAUDE.md"]);

    expect(report.summary.configurationFiles).toBe(2);
    expect(report.summary.potentialContextOverhead).toBeGreaterThan(0);
  });

  it("completes successfully without git and never fails on non-repo (Spec §34)", async () => {
    await writeFile(join(root, "CLAUDE.md"), "small config\n");
    const { report, git } = await runAnalyze({ rootPath: root });
    expect(git.sufficient).toBe(false);
    expect(report.summary.configurationFiles).toBe(1);
  });

  it("respects custom options (larger large-file threshold)", async () => {
    const content = "a".repeat(8000); // ~2000 tokens
    await writeFile(join(root, "CLAUDE.md"), content);

    const { report } = await runAnalyze({
      rootPath: root,
      options: { largeFileTokens: 5000 },
    });

    expect(report.findings.filter((f) => f.type === "large-file")).toHaveLength(
      0,
    );
  });
});
