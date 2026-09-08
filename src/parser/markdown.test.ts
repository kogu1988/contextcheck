import { describe, expect, it } from "vitest";

import { extractMarkdownSections, extractPreamble } from "./markdown.js";

describe("extractMarkdownSections", () => {
  it("splits on headings and accumulates content until the next heading", () => {
    const md =
      "# Code Style\nuse strict\n\n## Naming\ncamelCase\n# Testing\nvitest\n";
    const sections = extractMarkdownSections(md);

    expect(sections).toHaveLength(3);
    expect(sections[0]).toMatchObject({
      heading: "Code Style",
      level: 1,
      content: "use strict",
    });
    expect(sections[1]).toMatchObject({
      heading: "Naming",
      level: 2,
      content: "camelCase",
    });
    expect(sections[2]).toMatchObject({
      heading: "Testing",
      level: 1,
      content: "vitest",
    });
  });

  it("matches headings at any depth but not body text with hashes", () => {
    const md = "## Feature\nbody (not a # heading but ok)\n";
    const sections = extractMarkdownSections(md);
    expect(sections).toHaveLength(1);
    expect(sections[0]?.heading).toBe("Feature");
    expect(sections[0]?.level).toBe(2);
  });

  it("returns empty when there are no headings", () => {
    expect(extractMarkdownSections("plain text")).toEqual([]);
  });
});

describe("extractPreamble", () => {
  it("returns text before the first heading", () => {
    const md = "Intro line\nmore\n# Head\n";
    expect(extractPreamble(md)).toBe("Intro line\nmore");
  });

  it("returns empty when first line is a heading", () => {
    expect(extractPreamble("# Head\nbody")).toBe("");
  });
});
