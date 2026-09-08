import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { discover } from "../src/discovery/discover.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, "fixtures");

describe("committed fixture repository", () => {
  it("discovers the claude-and-cursor fixture correctly", async () => {
    const root = join(fixturesDir, "claude-and-cursor");
    const result = await discover(root);

    const paths = result.artifacts.map((a) => a.path).sort();
    expect(paths).toEqual([
      ".cursor/rules/database.mdc",
      ".cursorrules",
      "AGENTS.md",
      "CLAUDE.md",
      "skills/schema/SKILL.md",
    ]);

    const types = new Map(result.artifacts.map((a) => [a.path, a.type]));
    expect(types.get("CLAUDE.md")).toBe("instruction");
    expect(types.get("AGENTS.md")).toBe("instruction");
    expect(types.get(".cursorrules")).toBe("rule");
    expect(types.get(".cursor/rules/database.mdc")).toBe("rule");
    expect(types.get("skills/schema/SKILL.md")).toBe("skill");

    expect(result.unowned).toEqual([]);
    expect(result.skipped).toEqual([]);
  });

  it("normalizes cursor scope from frontmatter into ConfigurationScope", async () => {
    const root = join(fixturesDir, "claude-and-cursor");
    const result = await discover(root);

    const dbRule = result.artifacts.find(
      (a) => a.path === ".cursor/rules/database.mdc",
    );
    expect(dbRule?.scope).toEqual({
      patterns: ["src/db/**/*.ts"],
      alwaysApply: false,
    });

    const plainCursor = result.artifacts.find((a) => a.path === ".cursorrules");
    // .cursorrules has no YAML frontmatter, so scope is absent.
    expect(plainCursor?.scope).toBeUndefined();
  });
});

describe("excluded directories regression", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "cc-excl-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("ignores configuration inside excluded dirs (Spec §15, Rule 19)", async () => {
    // Real config inside excluded dirs must NOT be reported as user config.
    await mkdir(join(root, "node_modules", "some-pkg"), { recursive: true });
    await writeFile(
      join(root, "node_modules", "some-pkg", "CLAUDE.md"),
      "dep config\n",
    );
    await mkdir(join(root, "dist"), { recursive: true });
    await writeFile(join(root, "dist", "AGENTS.md"), "generated\n");
    await mkdir(join(root, ".next"), { recursive: true });
    await writeFile(join(root, ".next", "SKILL.md"), "build output\n");

    // Real project config, should still be found.
    await writeFile(join(root, "CLAUDE.md"), "project rules\n");

    const result = await discover(root);
    const paths = result.artifacts.map((a) => a.path);

    expect(paths).toContain("CLAUDE.md");
    expect(paths).not.toContain("node_modules/some-pkg/CLAUDE.md");
    expect(paths).not.toContain("dist/AGENTS.md");
    expect(paths).not.toContain(".next/SKILL.md");
    expect(result.artifacts).toHaveLength(1);
  });
});
