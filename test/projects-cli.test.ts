import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { analyzeAction, snapshotAction } from "../src/cli/index.js";
import { listProjects, addProjects } from "../src/projects/actions.js";
import { loadRegistry } from "../src/projects/registry.js";
import { listSnapshotFiles } from "../src/snapshot/manager.js";

function capture(fn: () => Promise<void>): Promise<string> {
  return new Promise((resolve) => {
    const chunks: string[] = [];
    const orig = process.stdout.write;
    (process.stdout.write as unknown as (c: string) => boolean) = (
      c: string,
    ) => {
      chunks.push(String(c));
      return true;
    };
    void fn().then(() => {
      process.stdout.write = orig;
      resolve(chunks.join(""));
    });
  });
}

describe("projects + CLI integration", () => {
  let baseDir: string;
  let projectA: string;
  let projectB: string;
  let origCwd: string;

  beforeEach(async () => {
    origCwd = process.cwd();
    baseDir = await mkdtemp(join(tmpdir(), "cc-cli9-reg-"));
    projectA = await mkdtemp(join(tmpdir(), "cc-cli9-a-"));
    projectB = await mkdtemp(join(tmpdir(), "cc-cli9-b-"));
  });

  afterEach(async () => {
    process.chdir(origCwd);
    await rm(baseDir, { recursive: true, force: true });
    await rm(projectA, { recursive: true, force: true });
    await rm(projectB, { recursive: true, force: true });
  });

  it("current-directory analyze still works (backward compat)", async () => {
    process.chdir(projectA);
    await writeFile(join(projectA, "CLAUDE.md"), "# Rules\n- use strict\n");
    const out = await capture(() => analyzeAction({}));
    expect(out).toContain("AI CONFIGURATION REPORT");
    expect(out).toContain("Configuration files       1");
  });

  it("projects add registers and persists across baseDir", async () => {
    const { added } = await addProjects([projectA, projectB], { baseDir });
    expect(added).toHaveLength(2);
    const reg = await loadRegistry(baseDir);
    expect(reg.projects).toHaveLength(2);
  });

  it("snapshots are isolated per project directory", async () => {
    process.chdir(projectA);
    await writeFile(join(projectA, "CLAUDE.md"), "# A\nrules\n");
    await capture(() => snapshotAction());
    expect(await listSnapshotFiles(projectA)).toHaveLength(1);

    // Project B must have NO snapshot — it is a different cwd altogether.
    expect(await listSnapshotFiles(projectA)).toHaveLength(1);
    expect(await listSnapshotFiles(projectB)).toHaveLength(0);
  });

  it("listProjects renders name and path", async () => {
    await addProjects([projectA], { baseDir });
    const { output } = await listProjects({ baseDir });
    expect(output).toContain("ContextCheck Projects");
    expect(output).toContain(projectA);
  });

  it("project/registry modules never import network clients (privacy)", async () => {
    // Static guarantee: the local-first registry must not depend on any
    // network transport. Assert the project modules import only local APIs.
    const files = ["registry", "paths", "detect", "actions", "onboarding"];
    const forbidden = [
      "node:http",
      "node:https",
      "node:undici",
      "node-fetch",
      "undici",
      "axios",
      "fetch(",
      "https.request",
      "http.request",
    ];
    for (const name of files) {
      const src = await readFile(join("src", "projects", `${name}.ts`), "utf8");
      for (const token of forbidden) {
        expect(
          src.includes(token),
          `${name}.ts must not use network transport ${token}`,
        ).toBe(false);
      }
    }
  });
});
