import { describe, expect, it } from "vitest";

import { parseConfiguration } from "./parse.js";

describe("parseConfiguration", () => {
  it("extracts frontmatter data and scope for a rule file", () => {
    const md =
      "---\ndescription: db rules\nglobs:\n  - src/db/**/*.ts\nalwaysApply: false\n---\n# DB Rule\nuse params\n";
    const parsed = parseConfiguration(md);

    expect(parsed.data).toEqual({
      description: "db rules",
      globs: ["src/db/**/*.ts"],
      alwaysApply: false,
    });
    expect(parsed.scope).toEqual({
      patterns: ["src/db/**/*.ts"],
      alwaysApply: false,
    });
    expect(parsed.body).toContain("# DB Rule");
    expect(parsed.sections).toHaveLength(1);
    expect(parsed.sections[0]?.heading).toBe("DB Rule");
    expect(parsed.invalidFrontmatter).toBe(false);
  });

  it("produces markdown sections for markdown files without frontmatter", () => {
    const md = "# A\nx\n\n# B\ny\n";
    const parsed = parseConfiguration(md);

    expect(parsed.scope).toBeUndefined();
    expect(parsed.sections).toHaveLength(2);
    expect(parsed.blocks).toHaveLength(0); // markdown path, no block chunking
  });

  it("uses plain-text block fallback for heading-less content (Rule 21)", () => {
    const text = "first meaningful rule here\n\nsecond meaningful rule here\n";
    const parsed = parseConfiguration(text);

    expect(parsed.sections).toHaveLength(0);
    expect(parsed.blocks.length).toBeGreaterThanOrEqual(2);
  });

  it("reports malformed frontmatter without discarding the body (Spec §34)", () => {
    const md = "---\nbad: [unclosed\n---\nbody stays\n";
    const parsed = parseConfiguration(md);

    expect(parsed.invalidFrontmatter).toBe(true);
    expect(parsed.body).toContain("body stays");
  });

  it("does not mutate the original content", () => {
    const md = "# H\ncontent\n";
    const before = md;
    const parsed = parseConfiguration(md);
    expect(md).toBe(before);
    expect(parsed.body).toContain("# H");
  });
});
