import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { walkFiles } from "./scanner.js";

describe("walkFiles", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "cc-walk-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  async function createTree(): Promise<void> {
    await writeFile(join(root, "CLAUDE.md"), "# rules\n");
    await writeFile(join(root, "AGENTS.md"), "# agents\n");
    await mkdir(join(root, "src"));
    await writeFile(join(root, "src", "SKILL.md"), "# skill\n");

    // Excluded: must not appear in results
    await mkdir(join(root, "node_modules", "pkg"), { recursive: true });
    await writeFile(
      join(root, "node_modules", "pkg", "CLAUDE.md"),
      "ignored\n",
    );
    await mkdir(join(root, "dist"));
    await writeFile(join(root, "dist", "AGENTS.md"), "ignored\n");
    await mkdir(join(root, ".git"));
    await writeFile(join(root, ".git", "config"), "ignored\n");
  }

  it("discovers regular files and normalizes relative paths", async () => {
    await createTree();
    const files = await walkFiles(root);

    const relPaths = files.map((f) => f.relativePath).sort();
    expect(relPaths).toContain("CLAUDE.md");
    expect(relPaths).toContain("AGENTS.md");
    expect(relPaths).toContain("src/SKILL.md");
  });

  it("skips excluded directories at any level", async () => {
    await createTree();
    const files = await walkFiles(root);

    const relPaths = files.map((f) => f.relativePath);
    expect(relPaths).not.toContain("node_modules/pkg/CLAUDE.md");
    expect(relPaths).not.toContain("dist/AGENTS.md");
    expect(relPaths).not.toContain(".git/config");
    // No path may traverse an excluded segment
    expect(
      relPaths.every(
        (p) =>
          !p.startsWith("node_modules/") &&
          !p.startsWith("dist/") &&
          !p.startsWith(".git/"),
      ),
    ).toBe(true);
  });
});
