import { describe, expect, it } from "vitest";

import {
  diffBetweenSnapshots,
  diffSnapshots,
  findFindingChanges,
  formatTokens,
} from "./diff.js";
import { renderDiff } from "../output/terminal.js";
import { buildSnapshot } from "./manager.js";
import { makeFinding } from "../analyzer/rules/mapping.js";
import { makeArtifact } from "../../test/helpers/artifact.js";

describe("Snapshot/Diff v1 edge cases", () => {
  it("no-op: identical snapshot diffs to zero findings and clean output", () => {
    const artifacts = [
      makeArtifact({ path: "CLAUDE.md", content: "x".repeat(400) }),
    ];
    const findings = [
      makeFinding({
        type: "duplicate",
        filePaths: ["a.md"],
        title: "a",
        description: "d",
      }),
    ];
    const before = buildSnapshot(artifacts, findings);
    const after = buildSnapshot(artifacts, findings);

    const diff = diffBetweenSnapshots(before, after);
    expect(diff.delta).toBe(0);
    expect(diff.addedFiles).toEqual([]);
    expect(diff.removedFiles).toEqual([]);
    expect(diff.findingChanges).toEqual({
      added: 0,
      removed: 0,
      changed: 0,
      unchanged: 1,
    });
    expect(diff.files.every((f) => f.status === "unchanged")).toBe(true);

    const out = renderDiff(diff);
    expect(out).toContain("(no configuration file changes)");
    expect(out).toContain("0 added · 0 modified · 0 removed");
    expect(out).not.toContain("[CAUTION]");
    expect(out).not.toContain("wasted");
  });

  it("legacy snapshot without findings loads and diffs cleanly", () => {
    // Simulate an old-format snapshot: no `findings` field at all.
    const legacy = buildSnapshot([
      makeArtifact({ path: "a.md", content: "x" }),
    ]);
    delete (legacy as { findings?: unknown }).findings;

    const next = buildSnapshot([
      makeArtifact({ path: "a.md", content: "x" }),
      makeArtifact({ path: "b.md", content: "y" }),
    ]);

    const diff = diffBetweenSnapshots(legacy, next);
    expect(diff.addedFiles).toEqual(["b.md"]);
    // Legacy has no findings -> treated as empty; new snapshot has none either.
    expect(diff.findingChanges).toEqual({
      added: 0,
      removed: 0,
      changed: 0,
      unchanged: 0,
    });
    expect(diff.findings).toEqual([]);
  });
});

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

describe("findFindingChanges", () => {
  it("detects added, resolved and unchanged findings by id", () => {
    const before = [
      makeFinding({
        type: "duplicate",
        filePaths: ["a.md"],
        title: "a",
        description: "d",
      }),
    ];
    const after = [
      makeFinding({
        type: "duplicate",
        filePaths: ["a.md"],
        title: "a",
        description: "d",
      }),
      makeFinding({
        type: "high-stakes",
        filePaths: ["b.md"],
        title: "b",
        description: "d",
      }),
    ];

    const changes = findFindingChanges(before, after);
    const byStatus = Object.fromEntries(changes.map((c) => [c.status, c]));
    expect(byStatus.unchanged).toBeTruthy();
    expect(byStatus.added).toBeTruthy();
    // duplicate (unchanged) + high-stakes (added)
    expect(changes.length).toBe(2);
  });

  it("marks a finding with the same type+paths but different id as changed", () => {
    const f1 = makeFinding({
      type: "high-stakes",
      filePaths: ["x.mdc"],
      title: "Old title",
      description: "d",
    });
    const f2 = makeFinding({
      type: "high-stakes",
      filePaths: ["x.mdc"],
      title: "New title",
      description: "d",
    });
    // Different title => different deterministic id.
    expect(f1.id).not.toBe(f2.id);

    const changes = findFindingChanges([f1], [f2]);
    expect(changes).toHaveLength(1);
    expect(changes[0]!.status).toBe("changed");
  });

  it("treats missing snapshot findings as empty (backward compatible)", () => {
    const after = [
      makeFinding({
        type: "duplicate",
        filePaths: ["a.md"],
        title: "a",
        description: "d",
      }),
    ];
    const changes = findFindingChanges([], after);
    expect(changes).toHaveLength(1);
    expect(changes[0]!.status).toBe("added");
  });
});

describe("renderDiff (Snapshot/Diff v1)", () => {
  it("renders artifacts, context and findings sections", () => {
    const before = [
      makeArtifact({ path: "CLAUDE.md", content: "a".repeat(2400) }),
    ]; // 600
    const after = [
      makeArtifact({ path: "CLAUDE.md", content: "a".repeat(1600) }),
    ]; // 400

    const beforeFindings = [
      makeFinding({
        type: "high-stakes",
        filePaths: ["CLAUDE.md"],
        title: "t",
        description: "d",
      }),
    ];
    const diff = diffSnapshots(before, after, beforeFindings, []);
    const out = renderDiff(diff);

    expect(out).toContain("ContextCheck Diff");
    expect(out).toContain("Snapshot: previous → current");
    expect(out).toContain("Artifacts");
    expect(out).toContain("~ CLAUDE.md");
    expect(out).toContain("600 → 400 tokens");
    expect(out).toContain("Context");
    expect(out).toContain("Previous  ~600 tokens");
    expect(out).toContain("Change    -200 tokens");
    expect(out).toContain("Findings");
    expect(out).toContain("- 1 resolved");
    expect(out).toContain("Summary");
    expect(out).toContain("0 added · 1 modified · 0 removed");
  });

  it("renders a new rule artifact", () => {
    const before = [] as ReturnType<typeof makeArtifact>[];
    const after = [makeArtifact({ path: "api.mdc", content: "x".repeat(400) })];
    const diff = diffSnapshots(before, after);
    const out = renderDiff(diff);
    expect(out).toContain("+ api.mdc");
    expect(out).toContain("1 added · 0 modified · 0 removed");
  });

  it("is consistent with formatTokens", () => {
    expect(formatTokens(4210)).toBe("4,210");
  });
});
