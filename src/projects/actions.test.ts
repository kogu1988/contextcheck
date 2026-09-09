import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  addProjects,
  analyzeAllProjects,
  listProjects,
  removeProjects,
  scanProjects,
} from "./actions.js";
import { addProject, loadRegistry, saveRegistry } from "./registry.js";

describe("project actions", () => {
  let baseDir: string;
  let parent: string;

  beforeEach(async () => {
    baseDir = await mkdtemp(join(tmpdir(), "cc-actions-reg-"));
    parent = await mkdtemp(join(tmpdir(), "cc-actions-proj-"));
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
    await rm(parent, { recursive: true, force: true });
  });

  it("adds and lists projects", async () => {
    const { added, output } = await addProjects([parent], { baseDir });
    expect(added).toHaveLength(1);
    expect(output).toContain("Added");

    const { entries, output: listOut } = await listProjects({ baseDir });
    expect(entries).toHaveLength(1);
    expect(listOut).toContain("1 project");
  });

  it("skips duplicate and missing paths", async () => {
    await addProjects([parent], { baseDir });
    const res = await addProjects([parent, join(parent, "missing")], {
      baseDir,
    });
    expect(res.added).toHaveLength(0);
    expect(res.skipped.length).toBeGreaterThanOrEqual(1);
  });

  it("removes a project from the registry without deleting the directory", async () => {
    await addProjects([parent], { baseDir });
    const { removed } = await removeProjects([parent], { baseDir });
    expect(removed).toHaveLength(1);
    const { entries } = await listProjects({ baseDir });
    expect(entries).toHaveLength(0);
    // Directory still exists (removal is registry-only).
    expect(hasDir(parent)).toBe(true);
  });

  it("marks missing projects in analyzeAll without failing", async () => {
    // Register a real project, then also register a fake (moved/deleted) path.
    await addProjects([parent], { baseDir });
    const regFile = await loadRegistry(baseDir);
    await addProject(regFile, join(parent, "gone"), "Gone", process.cwd());
    await saveRegistry(regFile, baseDir);

    const { output } = await analyzeAllProjects({ baseDir });
    expect(output).toContain("path not found");
    // The real project still analyzes fine.
    expect(output).toMatch(/AI configuration file/);
  });

  it("analyzes a project with no AI configuration as a success (not an error)", async () => {
    // Empty dir -> no AI config files, but not "broken".
    await addProjects([parent], { baseDir });
    const { output } = await analyzeAllProjects({ baseDir });
    expect(output).not.toContain("failed");
    expect(output).toMatch(/AI configuration file/);
  });

  it("scans immediate children and adds candidates when confirmed", async () => {
    await mkdir(join(parent, "PetPal"));
    await writeFile(join(parent, "PetPal", "package.json"), "{}");
    await mkdir(join(parent, "node_modules", "junk"), { recursive: true });

    const { added, candidates } = await scanProjects(parent, {
      baseDir,
      prompt: { confirm: () => Promise.resolve(true) },
    });
    expect(candidates).toHaveLength(1);
    expect(added).toHaveLength(1);
  });

  it("scan does not add when confirmation is declined", async () => {
    await mkdir(join(parent, "App"), { recursive: true });
    await writeFile(join(parent, "App", "package.json"), "{}");
    const { added } = await scanProjects(parent, {
      baseDir,
      prompt: { confirm: () => Promise.resolve(false) },
    });
    expect(added).toHaveLength(0);
  });

  it("scan does NOT auto-add without a prompt (non-interactive safe default)", async () => {
    await mkdir(join(parent, "Solo"), { recursive: true });
    await writeFile(join(parent, "Solo", "package.json"), "{}");
    // No prompt provided -> must not add (never bulk-add unseen dirs).
    const { added, candidates } = await scanProjects(parent, { baseDir });
    expect(candidates).toHaveLength(1);
    expect(added).toHaveLength(0);
    expect((await loadRegistry(baseDir)).projects).toHaveLength(0);
  });

  it("scan reports a missing parent gracefully", async () => {
    const { output, candidates } = await scanProjects(join(parent, "nope"), {
      baseDir,
    });
    expect(candidates).toEqual([]);
    expect(output).toContain("not found");
  });
});

function hasDir(p: string): boolean {
  return existsSync(p);
}
