import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  addProject,
  emptyRegistry,
  generateProjectId,
  loadRegistry,
  registryDir,
  registryPath,
  removeProject,
  saveRegistry,
} from "./registry.js";
import { pathExists } from "./paths.js";

describe("registry", () => {
  let baseDir: string;
  let projectDir: string;

  beforeEach(async () => {
    baseDir = await mkdtemp(join(tmpdir(), "cc-reg-"));
    projectDir = await mkdtemp(join(tmpdir(), "cc-proj-"));
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
    await rm(projectDir, { recursive: true, force: true });
  });

  it("returns an empty registry when the file is missing", async () => {
    const reg = await loadRegistry(baseDir);
    expect(reg.projects).toEqual([]);
  });

  it("handles a corrupted registry gracefully", async () => {
    await writeFile(registryPath(baseDir), "{ not json", "utf8");
    const reg = await loadRegistry(baseDir);
    expect(reg.projects).toEqual([]);
  });

  it("persists and reloads a project", async () => {
    const reg = await loadRegistry(baseDir);
    const res = await addProject(reg, projectDir, "TestProj", process.cwd());
    expect(res.added).toBe(true);
    expect(res.entry?.name).toBe("TestProj");
    expect(res.entry?.path).toBe(projectDir);
    // id is NOT derived from repo URL / path hash collisions.
    expect(res.entry?.id).toMatch(/^proj_/);

    await saveRegistry(reg, baseDir);
    const reloaded = await loadRegistry(baseDir);
    expect(reloaded.projects).toHaveLength(1);
    expect(reloaded.projects[0]?.id).toBe(res.entry?.id);
  });

  it("detects duplicate projects by normalized path (trailing sep / case)", async () => {
    const reg = await loadRegistry(baseDir);
    const a = await addProject(reg, projectDir, "A", process.cwd());
    expect(a.added).toBe(true);

    const duplicateWithSep = await addProject(
      reg,
      `${projectDir}\\`,
      "A",
      process.cwd(),
    );
    expect(duplicateWithSep.added).toBe(false);

    const res = await addProject(reg, projectDir, "A", process.cwd());
    expect(res.added).toBe(false);
  });

  it("removes a project without touching the directory", async () => {
    const reg = await loadRegistry(baseDir);
    const res = await addProject(reg, projectDir, "A", process.cwd());
    await saveRegistry(reg, baseDir);

    const removed = removeProject(reg, res.entry!.id, process.cwd());
    expect(removed).toBe(true);
    expect(reg.projects).toHaveLength(0);
    // Directory must still exist.
    expect(pathExists(projectDir)).toBe(true);
  });

  it("generates distinct local ids", () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateProjectId()));
    expect(ids.size).toBe(50);
  });

  it("registryDir follows platform conventions", () => {
    const win = registryDir("C:\\Users\\u", "win32");
    expect(win).toContain("contextcheck");
    const nix = registryDir("/home/u", "linux");
    expect(nix).toContain(".config");
  });

  it("emptyRegistry has version 1", () => {
    expect(emptyRegistry()).toEqual({ version: 1, projects: [] });
  });
});
