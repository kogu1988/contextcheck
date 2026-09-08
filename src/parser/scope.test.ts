import { describe, expect, it } from "vitest";

import { parseAlwaysApply, parsePatterns, parseScope } from "./scope.js";

describe("parsePatterns", () => {
  it("normalizes a single glob string into an array", () => {
    expect(parsePatterns("src/**/*.tsx")).toEqual(["src/**/*.tsx"]);
  });

  it("keeps valid strings from an array and drops empties", () => {
    expect(parsePatterns(["a/**", "", "b/**"])).toEqual(["a/**", "b/**"]);
  });

  it("returns undefined for non-string/array junk", () => {
    expect(parsePatterns(42)).toBeUndefined();
    expect(parsePatterns(undefined)).toBeUndefined();
    expect(parsePatterns({ a: 1 })).toBeUndefined();
    expect(parsePatterns("   ")).toBeUndefined();
  });
});

describe("parseAlwaysApply", () => {
  it("reads a boolean", () => {
    expect(parseAlwaysApply(true)).toBe(true);
    expect(parseAlwaysApply(false)).toBe(false);
  });

  it("ignores non-booleans", () => {
    expect(parseAlwaysApply("yes")).toBeUndefined();
    expect(parseAlwaysApply(undefined)).toBeUndefined();
  });
});

describe("parseScope", () => {
  it("builds a scope from globs and alwaysApply", () => {
    const scope = parseScope({ globs: ["db/**"], alwaysApply: false });
    expect(scope).toEqual({ patterns: ["db/**"], alwaysApply: false });
  });

  it("returns undefined when no scope info present", () => {
    expect(parseScope({ description: "x" })).toBeUndefined();
    expect(parseScope(undefined)).toBeUndefined();
  });

  it("handles single-string globs", () => {
    expect(parseScope({ globs: "only.ts" })).toEqual({ patterns: ["only.ts"] });
  });

  it("returns a partial scope when only one field is present", () => {
    expect(parseScope({ alwaysApply: true })).toEqual({ alwaysApply: true });
    expect(parseScope({ globs: ["x"] })).toEqual({ patterns: ["x"] });
  });
});
