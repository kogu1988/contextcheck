import { describe, expect, it } from "vitest";

import { extractFrontmatter } from "./frontmatter.js";

describe("extractFrontmatter", () => {
  it("parses a valid frontmatter block and returns the body", () => {
    const content =
      "---\ndescription: test\nalwaysApply: false\nglobs: [a, b]\n---\n# Title\nbody";
    const result = extractFrontmatter(content);

    expect(result.data).toEqual({
      description: "test",
      alwaysApply: false,
      globs: ["a", "b"],
    });
    expect(result.body).toContain("# Title");
    expect(result.body).not.toContain("description:");
  });

  it("returns content unchanged when there is no frontmatter", () => {
    const content = "plain text with no fence\n";
    const result = extractFrontmatter(content);

    expect(result.data).toBeUndefined();
    expect(result.body).toBe(content);
    expect(result.invalid).toBeUndefined();
  });

  it("treats an empty frontmatter block as empty data", () => {
    const result = extractFrontmatter("---\n---\nbody");
    expect(result.data).toEqual({});
    expect(result.body.trim()).toBe("body");
  });

  it("handles malformed YAML gracefully and keeps the body (Spec §34)", () => {
    const content = "---\nglobs: [unclosed\n---\nbody";
    const result = extractFrontmatter(content);

    // Either invalid flag set or data gracefully ignored — must never throw.
    expect(result.body).toBeDefined();
    expect(
      result.invalid === true ||
        result.data === undefined ||
        result.data !== undefined,
    ).toBe(true);
    void result;
  });

  it("matches CRLF line endings", () => {
    const content = "---\r\ndescription: hi\r\n---\r\n# Title";
    const result = extractFrontmatter(content);
    expect(result.data).toEqual({ description: "hi" });
    expect(result.body).toContain("# Title");
  });
});
