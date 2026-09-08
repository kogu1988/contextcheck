import { describe, expect, it } from "vitest";

import {
  changedFilesInWindow,
  globMatch,
  matchesChangedFile,
} from "./history.js";
import type { GitRunner } from "./sufficiency.js";

describe("globMatch", () => {
  it("matches exact and dir-prefix patterns", () => {
    expect(globMatch("CLAUDE.md", "CLAUDE.md")).toBe(true);
    expect(globMatch("src/", "src/lib/a.ts")).toBe(true);
    expect(globMatch("src/lib", "src/lib/a.ts")).toBe(true);
  });

  it("matches ** and * globs", () => {
    expect(globMatch("components/**/*.tsx", "components/Button.tsx")).toBe(
      true,
    );
    expect(
      globMatch("components/**/*.tsx", "components/nested/Button.tsx"),
    ).toBe(true);
    expect(globMatch("src/*.ts", "src/index.ts")).toBe(true);
    expect(globMatch("src/*.ts", "src/deep/index.ts")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(globMatch("SRC/**", "src/Index.ts")).toBe(true);
  });

  it("does not over-match unrelated paths", () => {
    expect(globMatch("components/**/*.tsx", "src/Button.tsx")).toBe(false);
  });
});

describe("matchesChangedFile", () => {
  it("returns true when any changed path matches", () => {
    const changed = ["src/app.ts", "components/Button.tsx"];
    expect(matchesChangedFile("components/**", changed)).toBe(true);
    expect(matchesChangedFile("nothing/**", changed)).toBe(false);
  });
});

describe("changedFilesInWindow", () => {
  it("parses git log name-only output into a de-duplicated set", async () => {
    const runner: GitRunner = async () =>
      "src/a.ts\n\nsrc/a.ts\ncomponents/b.tsx\n";
    const files = await changedFilesInWindow("/repo", 90, runner);
    expect(files).toEqual(["src/a.ts", "components/b.tsx"]);
  });
});
