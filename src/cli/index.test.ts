import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { analyzeAction, diffAction, snapshotAction } from "./index.js";

describe("CLI analyze integration", () => {
  let root: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    root = await mkdtemp(join(tmpdir(), "cc-cli-"));
    process.chdir(root);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(root, { recursive: true, force: true });
  });

  it("renders a terminal report with findings", async () => {
    await writeFile(join(root, "CLAUDE.md"), "# Rules\n- use strict\n");
    const out = await captureStdout(() => analyzeAction({}));
    expect(out).toContain("AI CONFIGURATION REPORT");
    expect(out).toContain("Configuration files       1");
  });

  it("emits privacy-safe JSON (no raw content) with --json", async () => {
    await writeFile(
      join(root, "CLAUDE.md"),
      "# Rules\nThis is a secret rule body\n",
    );
    const out = await captureStdout(() => analyzeAction({ json: true }));

    expect(out).toContain('"configurationFiles": 1');
    expect(out).not.toContain("secret rule body");
    expect(out).not.toContain('"content"');
  });

  it("expands details in verbose mode", async () => {
    // A large file to trigger a large-file finding, then confirm verbose detail.
    await writeFile(
      join(root, "CLAUDE.md"),
      `${"line of instruction\n".repeat(700)}`,
    );
    const out = await captureStdout(() => analyzeAction({ verbose: true }));
    expect(out).toContain("unusually large");
    expect(out).toContain("Consider whether");
  });

  it("snapshot then diff reports the change", async () => {
    await writeFile(join(root, "CLAUDE.md"), "# Rules\n- strict\n");
    await captureStdout(() => snapshotAction());

    // Change the config, then diff should show the delta.
    await writeFile(
      join(root, "CLAUDE.md"),
      "# Rules\n- strict\n- more rules here\n",
    );
    const out = await captureStdout(() => diffAction());
    expect(out).toContain("contextcheck CONFIG DIFF");
    expect(out).toContain("CLAUDE.md");
    expect(out).toContain("Difference");
  });

  it("snapshot output is privacy-safe (no content field on disk)", async () => {
    await writeFile(join(root, "CLAUDE.md"), "# Rules\nsecret rule body\n");
    await captureStdout(() => snapshotAction());

    const snapDir = join(root, ".contextcheck", "snapshots");
    const files = await readdir(snapDir);
    const raw = await readFile(join(snapDir, files[0]!), "utf8");
    expect(raw).not.toContain("secret rule body");
    expect(raw).not.toContain('"content"');
  });
});

function captureStdout(fn: () => Promise<void>): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: string[] = [];
    const original = process.stdout.write;
    (process.stdout.write as unknown as (c: string) => boolean) = (
      chunk: string,
    ): boolean => {
      chunks.push(String(chunk));
      return true;
    };
    void fn()
      .then(() => {
        process.stdout.write = original;
        resolve(chunks.join(""));
      })
      .catch((err) => {
        process.stdout.write = original;
        reject(err);
      });
  });
}
