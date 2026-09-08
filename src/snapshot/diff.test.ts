import { describe, expect, it } from "vitest";

import { diffBetweenSnapshots, diffSnapshots, formatTokens } from "./diff.js";
import { renderDiff } from "../output/terminal.js";
import { buildSnapshot } from "./manager.js";
import { makeArtifact } from "../../test/helpers/artifact.js";

describe("diffSnapshots (Spec §30)", () => {
  it("computes per-file token deltas and total change", () => {
    const before = [
      makeArtifact({ path: "CLAUDE.md", content: "a".repeat(800) }), // 200
      makeArtifact({ path: "AGENTS.md", content: "b".repeat(400) }), // 100
    ];
    const after = [
      makeArtifact({ path: "CLAUDE.md", content: "a".repeat(2400) }), // 600
      makeArtifact({ path: "AGENTS.md", content: "c".repeat(400) }), // 100
    ];

    const snapBefore = buildSnapshot(before);
    const snapAfter = buildSnapshot(after);
    const diff = diffBetweenSnapshots(snapBefore, snapAfter);

    const claude = diff.files.find((f) => f.path === "CLAUDE.md")!;
    expect(claude.status).toBe("changed");
    expect(claude.delta).toBe(400);

    const agents = diff.files.find((f) => f.path === "AGENTS.md")!;
    expect(agents.status).toBe("unchanged");
    expect(agents.delta).toBe(0);

    expect(diff.beforeTokens).toBe(300);
    expect(diff.afterTokens).toBe(700);
    expect(diff.delta).toBe(400);
  });

  it("flags added and removed files", () => {
    const before = [
      makeArtifact({ path: "CLAUDE.md", content: "x".repeat(400) }),
    ]; // 100
    const after = [
      makeArtifact({ path: "SKILL.md", content: "y".repeat(400) }),
    ]; // 100

    const diff = diffSnapshots(before, after);
    expect(diff.addedFiles).toEqual(["SKILL.md"]);
    expect(diff.removedFiles).toEqual(["CLAUDE.md"]);

    const skill = diff.files.find((f) => f.path === "SKILL.md")!;
    expect(skill.status).toBe("added");
    const claude = diff.files.find((f) => f.path === "CLAUDE.md")!;
    expect(claude.status).toBe("removed");
  });

  it("returns an empty diff for identical snapshots", () => {
    const before = [makeArtifact({ path: "a.md", content: "x".repeat(400) })];
    const diff = diffSnapshots(before, before);
    expect(diff.delta).toBe(0);
    expect(diff.files.every((f) => f.status === "unchanged")).toBe(true);
  });
});

describe("renderDiff (Spec §30)", () => {
  it("renders token changes and totals", () => {
    const before = [
      makeArtifact({ path: "CLAUDE.md", content: "a".repeat(2400) }),
    ]; // 600
    const after = [
      makeArtifact({ path: "CLAUDE.md", content: "a".repeat(1600) }),
    ]; // 400

    const diff = diffSnapshots(before, after);
    const out = renderDiff(diff);

    expect(out).toContain("contextcheck CONFIG DIFF");
    expect(out).toContain("CLAUDE.md");
    expect(out).toContain("- 200 tokens");
    expect(out).toContain("Previous     ~600");
    expect(out).toContain("Current      ~400");
    expect(out).toContain("Difference   -200 tokens");
  });

  it("renders a new rule", () => {
    const before = [] as ReturnType<typeof makeArtifact>[];
    const after = [makeArtifact({ path: "api.mdc", content: "x".repeat(400) })];
    const diff = diffSnapshots(before, after);
    const out = renderDiff(diff);
    expect(out).toContain("+ new rule");
  });

  it("is consistent with formatTokens", () => {
    expect(formatTokens(4210)).toBe("4,210");
  });
});
