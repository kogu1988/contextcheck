import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { discover } from "./discover.js";

describe("discover", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "cc-disc-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  async function writeTree(): Promise<void> {
    await writeFile(join(root, "CLAUDE.md"), "# claude rules\n");
    await writeFile(join(root, "AGENTS.md"), "# agents rules\n");
    await writeFile(join(root, ".cursorrules"), "plain cursor rules\n");
    await mkdir(join(root, ".cursor", "rules"), { recursive: true });
    await writeFile(
      join(root, ".cursor", "rules", "api.mdc"),
      "---\nglobs: api/**\n---\nbe nice\n",
    );
    await mkdir(join(root, "skills", "diagrams"), { recursive: true });
    await writeFile(
      join(root, "skills", "diagrams", "SKILL.md"),
      "# diagram skill\n",
    );
    // Non-config: must be unowned
    await writeFile(join(root, "README.md"), "readme\n");
    // Excluded: must not appear at all
    await mkdir(join(root, "node_modules", "pkg"), { recursive: true });
    await writeFile(
      join(root, "node_modules", "pkg", "CLAUDE.md"),
      "ignored\n",
    );
  }

  it("discovers all supported formats and normalizes types", async () => {
    await writeTree();
    const result = await discover(root);

    const byType = new Map<string, string[]>();
    for (const a of result.artifacts) {
      byType.set(a.type, [...(byType.get(a.type) ?? []), a.path].sort());
    }

    expect(byType.get("instruction")).toEqual(
      ["AGENTS.md", "CLAUDE.md"].sort(),
    );
    expect(byType.get("rule")).toEqual(
      [".cursorrules", ".cursor/rules/api.mdc"].sort(),
    );
    expect(byType.get("skill")).toEqual(["skills/diagrams/SKILL.md"]);
    expect(result.artifacts).toHaveLength(5);
  });

  it("leaves non-config files unowned and excludes node_modules", async () => {
    await writeTree();
    const result = await discover(root);

    expect(result.unowned).toContain("README.md");
    expect(result.unowned).not.toContain("node_modules/pkg/CLAUDE.md");
    expect(result.artifacts.map((a) => a.path)).not.toContain(
      "node_modules/pkg/CLAUDE.md",
    );
  });

  it("computes relative paths and metadata for every artifact", async () => {
    await writeTree();
    const result = await discover(root);

    for (const a of result.artifacts) {
      expect(a.path).not.toContain("\\");
      expect(a.metadata.sizeBytes).toBeGreaterThan(0);
      expect(a.metadata.lineCount).toBeGreaterThan(0);
      expect(a.metadata.estimatedTokens).toBe(Math.round(a.content.length / 4));
      expect(a.id).toMatch(/^artifact_/);
    }
  });
});
