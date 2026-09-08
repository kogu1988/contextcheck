import { describe, expect, it } from "vitest";

import { assessGitHistory, isShallowRepository } from "./sufficiency.js";
import type { GitRunner } from "./sufficiency.js";

const notRepoRunner: GitRunner = async () => {
  throw new Error("not a git repo");
};

describe("assessGitHistory (Spec §24)", () => {
  it("returns insufficient when not a git repository", async () => {
    const result = await assessGitHistory("/no/repo", 90, notRepoRunner);
    expect(result.sufficient).toBe(false);
    expect(result.isGitRepo).toBe(false);
  });

  it("returns sufficient when there is history within the window", async () => {
    const runner: GitRunner = async (_root, args) => {
      if (args[0] === "rev-parse") return "true";
      if (args[0] === "rev-list" && args[1] === "--count" && args[2] === "HEAD")
        return "100";
      if (args[0] === "rev-list" && args[1] === "--count" && args[3] === "HEAD")
        return "30";
      return "";
    };
    const result = await assessGitHistory("/repo", 90, runner);
    expect(result.sufficient).toBe(true);
    expect(result.totalCommitCount).toBe(100);
    expect(result.windowCommitCount).toBe(30);
  });

  it("returns insufficient when total history is shorter than the window", async () => {
    const runner: GitRunner = async (_r, args) => {
      if (args[0] === "rev-parse") return "true";
      // window == total => history shorter than window
      return "10";
    };
    const result = await assessGitHistory("/repo", 90, runner);
    expect(result.sufficient).toBe(false);
  });

  it("returns insufficient when window commit count is zero", async () => {
    const runner: GitRunner = async (_r, args) => {
      if (args[0] === "rev-parse") return "true";
      if (args[0] === "rev-list" && args[1] === "--count" && args[2] === "HEAD")
        return "50";
      return "0";
    };
    const result = await assessGitHistory("/repo", 90, runner);
    expect(result.sufficient).toBe(false);
  });
});

describe("isShallowRepository (Rule 26)", () => {
  it("is false when .git/shallow is absent", () => {
    expect(isShallowRepository("/definitely/missing/repo")).toBe(false);
  });
});
