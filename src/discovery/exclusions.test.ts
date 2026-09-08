import { describe, expect, it } from "vitest";

import {
  EXCLUDED_DIRECTORIES,
  isExcludedDirectory,
  traversesExcludedDirectory,
} from "./exclusions.js";

describe("exclusions", () => {
  it("excludes the spec-defined directories", () => {
    for (const dir of [
      ".git",
      ".contextcheck",
      "node_modules",
      "vendor",
      "dist",
      "build",
      ".next",
      "out",
      "coverage",
      ".cache",
      "tmp",
      "temp",
    ]) {
      expect(isExcludedDirectory(dir)).toBe(true);
    }
  });

  it("does not exclude normal source directories", () => {
    for (const dir of ["src", "lib", "packages", "assets", "docs"]) {
      expect(isExcludedDirectory(dir)).toBe(false);
    }
  });

  it("is case-insensitive", () => {
    expect(isExcludedDirectory("Node_Modules")).toBe(true);
    expect(isExcludedDirectory("DIST")).toBe(true);
  });

  it("detects excluded segments anywhere in a normalized path", () => {
    expect(traversesExcludedDirectory("node_modules/foo/CLAUDE.md")).toBe(true);
    expect(traversesExcludedDirectory("src/node_modules/CLAUDE.md")).toBe(true);
    expect(traversesExcludedDirectory("dist/out/AGENTS.md")).toBe(true);
    expect(traversesExcludedDirectory("src/CLAUDE.md")).toBe(false);
  });

  it("exports the full excluded list verbatim", () => {
    expect(EXCLUDED_DIRECTORIES).toContain("node_modules");
    expect(EXCLUDED_DIRECTORIES).toContain(".git");
  });
});
