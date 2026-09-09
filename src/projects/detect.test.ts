import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { findLikelyProjects, isLikelyProject } from "./detect.js";

describe("detect", () => {
  let parent: string;

  beforeEach(async () => {
    parent = await mkdtemp(join(tmpdir(), "cc-detect-"));
  });

  afterEach(async () => {
    await rm(parent, { recursive: true, force: true });
  });

  it("treats a dir with package.json as a likely project", async () => {
    await mkdir(join(parent, "app"), { recursive: true });
    await writeFile(join(parent, "app", "package.json"), "{}");
    expect(await isLikelyProject(join(parent, "app"))).toBe(true);
  });

  it("treats a .git dir as a likely project and excludes node_modules", async () => {
    await mkdir(join(parent, "repo", ".git"), { recursive: true });
    await mkdir(join(parent, "node_modules", "x"), { recursive: true });
    const found = await findLikelyProjects(parent);
    const names = found.map((c) => c.name);
    expect(names).toContain("repo");
    expect(names).not.toContain("node_modules");
  });

  it("does not recurse into arbitrary descendants", async () => {
    // A .git only in a grandchild should NOT surface as a child candidate.
    await mkdir(join(parent, "outer", "inner", ".git"), { recursive: true });
    const found = await findLikelyProjects(parent);
    expect(found.map((c) => c.name)).not.toContain("inner");
    expect(found.map((c) => c.name)).not.toContain("outer");
  });

  it("ignores non-project child dirs and files", async () => {
    await mkdir(join(parent, "junkdir"), { recursive: true });
    await mkdir(join(parent, "app"), { recursive: true });
    await writeFile(join(parent, "app", "package.json"), "{}");
    await writeFile(join(parent, "readme.txt"), "x");
    const found = await findLikelyProjects(parent);
    expect(found.map((c) => c.name)).toEqual(["app"]);
  });

  it("recognizes multiple signal types", async () => {
    for (const [name, signal] of [
      ["a", "pyproject.toml"],
      ["b", "go.mod"],
      ["c", "Cargo.toml"],
      ["d", "pom.xml"],
    ] as const) {
      await mkdir(join(parent, name), { recursive: true });
      await writeFile(join(parent, name, signal), "");
    }
    const found = await findLikelyProjects(parent);
    expect(found.map((c) => c.name).sort()).toEqual(["a", "b", "c", "d"]);
  });

  it("returns empty for a missing parent", async () => {
    expect(await findLikelyProjects(join(parent, "nope"))).toEqual([]);
  });
});
