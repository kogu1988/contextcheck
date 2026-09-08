import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { agentsAdapter } from "./agents.js";
import { claudeAdapter } from "./claude.js";
import { cursorAdapter } from "./cursor.js";
import { skillAdapter } from "./skill.js";
import type { ConfigurationAdapter } from "./types.js";

describe("claude adapter", () => {
  it("matches CLAUDE.md at root and nested level", () => {
    expect(claudeAdapter.matches("CLAUDE.md")).toBe(true);
    expect(claudeAdapter.matches("src/CLAUDE.md")).toBe(true);
  });

  it("does not match other files", () => {
    expect(claudeAdapter.matches("AGENTS.md")).toBe(false);
    expect(claudeAdapter.matches("src/SKILL.md")).toBe(false);
    expect(claudeAdapter.matches("claude.md")).toBe(false); // case-sensitive
  });
});

describe("agents adapter", () => {
  it("matches AGENTS.md at root and nested level", () => {
    expect(agentsAdapter.matches("AGENTS.md")).toBe(true);
    expect(agentsAdapter.matches("lib/AGENTS.md")).toBe(true);
  });

  it("does not match other files", () => {
    expect(agentsAdapter.matches("CLAUDE.md")).toBe(false);
    expect(agentsAdapter.matches("SKILL.md")).toBe(false);
  });
});

describe("skill adapter", () => {
  it("matches SKILL.md at any depth", () => {
    expect(skillAdapter.matches("SKILL.md")).toBe(true);
    expect(skillAdapter.matches("skills/my-skill/SKILL.md")).toBe(true);
  });

  it("does not match other files", () => {
    expect(skillAdapter.matches("claude.md")).toBe(false);
    expect(skillAdapter.matches("README.md")).toBe(false);
  });
});

describe("cursor adapter", () => {
  it("matches .cursorrules and .cursor/rules/", () => {
    expect(cursorAdapter.matches(".cursorrules")).toBe(true);
    expect(cursorAdapter.matches(".cursor/rules/api.mdc")).toBe(true);
    expect(cursorAdapter.matches(".cursor/rules/design.md")).toBe(true);
    expect(cursorAdapter.matches(".cursor/rules/nested/thing.mdc")).toBe(true);
  });

  it("does not match other paths", () => {
    expect(cursorAdapter.matches(".cursor/settings.json")).toBe(false);
    expect(cursorAdapter.matches("cursorrules")).toBe(false);
  });
});

describe("adapter parse", () => {
  let root: string;
  const cases: Array<{
    adapter: ConfigurationAdapter;
    file: string;
    type: string;
  }> = [
    { adapter: claudeAdapter, file: "CLAUDE.md", type: "instruction" },
    { adapter: agentsAdapter, file: "AGENTS.md", type: "instruction" },
    { adapter: skillAdapter, file: "skills/ext/SKILL.md", type: "skill" },
    { adapter: cursorAdapter, file: ".cursor/rules/api.mdc", type: "rule" },
  ];

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "cc-adapter-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  for (const { adapter, file, type } of cases) {
    it(`${adapter.name} parses ${file} into a ${type} artifact`, async () => {
      const abs = join(root, file);
      await mkdir(join(root, file.split("/").slice(0, -1).join("/")), {
        recursive: true,
      });
      await writeFile(abs, "# title\n\nsome body\n");

      const artifact = await adapter.parse(abs, root);
      expect(artifact.type).toBe(type);
      expect(artifact.path).toBe(file);
      expect(artifact.content).toContain("some body");
      expect(artifact.metadata.sizeBytes).toBeGreaterThan(0);
      expect(artifact.metadata.lineCount).toBe(3);
      expect(artifact.metadata.estimatedTokens).toBe(
        Math.round(artifact.content.length / 4),
      );
      expect(artifact.id).toMatch(/^artifact_/);
    });
  }
});
