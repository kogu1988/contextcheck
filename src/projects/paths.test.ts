import { describe, expect, it } from "vitest";

import {
  canonicalProjectKey,
  isCaseInsensitivePlatform,
  nameFromPath,
  normalizeProjectPath,
  pathExists,
} from "./paths.js";

describe("normalizeProjectPath", () => {
  it("normalizes trailing separators away (except drive root)", () => {
    const norm = normalizeProjectPath("C:\\Projects\\PetPal\\", "C:\\Projects");
    // On Windows path.normalize yields backslashes; on CI (non-win) POSIX.
    expect(norm.endsWith("PetPal")).toBe(true);
    expect(/[\\/]$/.test(norm)).toBe(false);
  });

  it("resolves relative paths against cwd (POSIX-style)", () => {
    // On POSIX paths are absolute after cwd-resolution; on Windows too.
    const cwd = process.cwd();
    const norm = normalizeProjectPath(".", cwd);
    expect(norm.toLowerCase().replace(/\\/g, "/")).toBe(
      cwd.toLowerCase().replace(/\\/g, "/"),
    );
  });

  it("collapses . and .. segments", () => {
    const cwd = "C:\\Projects\\Foo";
    const norm = normalizeProjectPath("C:\\Projects\\Foo\\..\\PetPal", cwd);
    expect(norm.replace(/\\/g, "/").toLowerCase()).toContain("petpal");
    expect(norm.replace(/\\/g, "/").toLowerCase()).not.toContain("foo");
  });
});

describe("canonicalProjectKey (dedup)", () => {
  it("treats trailing separator and dot segments as identical", () => {
    const cwd = "C:\\Projects\\Foo";
    const a = canonicalProjectKey("C:\\Projects\\PetPal", cwd);
    const b = canonicalProjectKey("C:\\Projects\\PetPal\\", cwd);
    const c = canonicalProjectKey("C:\\Projects\\Foo\\..\\PetPal", cwd);
    expect(a).toBe(b);
    expect(a).toBe(c);
  });

  it("is case-insensitive on Windows", () => {
    const cwd = "C:\\Projects";
    const a = canonicalProjectKey("C:\\Projects\\PetPal", cwd);
    const b = canonicalProjectKey("c:\\projects\\petpal", cwd);
    if (isCaseInsensitivePlatform()) {
      expect(a).toBe(b);
    }
  });
});

describe("nameFromPath", () => {
  it("derives name from the final segment", () => {
    expect(nameFromPath("C:\\Projects\\PetPal")).toBe("PetPal");
    expect(nameFromPath("/home/u/my-app")).toBe("my-app");
  });
});

describe("pathExists", () => {
  it("returns false for missing paths", () => {
    expect(pathExists("Z:\\definitely\\missing\\path")).toBe(false);
  });
  it("returns true for the cwd", () => {
    expect(pathExists(process.cwd())).toBe(true);
  });
});
