import { describe, expect, it } from "vitest";

import {
  chunkPlainText,
  MIN_BLOCK_CHARS,
  normalizeBlock,
} from "./plain-text.js";

describe("normalizeBlock", () => {
  it("collapses whitespace and trims", () => {
    expect(normalizeBlock("  a\n   b\t\n c  ")).toBe("a b c");
  });
});

describe("chunkPlainText", () => {
  it("splits on blank lines into blocks", () => {
    const text = "block one here\n\nblock two here\n\nblock three here";
    const blocks = chunkPlainText(text);

    expect(blocks.map((b) => b.normalized)).toEqual([
      "block one here",
      "block two here",
      "block three here",
    ]);
  });

  it("ignores very short blocks (Spec §18 step 2)", () => {
    const text = "long enough block content here\n\nx\n\nyyy";
    const blocks = chunkPlainText(text);
    const normals = blocks.map((b) => b.normalized);
    expect(normals).toContain("long enough block content here");
    expect(normals).not.toContain("x");
    expect(normals).not.toContain("yyy");
  });

  it("tracks starting line numbers", () => {
    const text = "first block\nstill first\n\nsecond block";
    const blocks = chunkPlainText(text);
    expect(blocks[0]?.startLine).toBe(0);
    expect(blocks[1]?.startLine).toBe(3);
  });

  it("treats multiple blank lines as one separator", () => {
    const text = "alpha block\n\n\n\nbeta block";
    const blocks = chunkPlainText(text);
    expect(blocks).toHaveLength(2);
  });

  it("respects MIN_BLOCK_CHARS constant", () => {
    expect(MIN_BLOCK_CHARS).toBeGreaterThan(0);
  });
});
