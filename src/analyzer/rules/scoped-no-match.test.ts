import { describe, expect, it } from "vitest";

import { scopedNoMatchRule } from "./scoped-no-match.js";
import type { AnalysisContext } from "../types.js";
import { DEFAULT_ANALYSIS_OPTIONS } from "../types.js";
import { makeArtifact } from "../../../test/helpers/artifact.js";

function ctx(overrides: Partial<AnalysisContext> = {}): AnalysisContext {
  return { rootPath: "/repo", options: DEFAULT_ANALYSIS_OPTIONS, ...overrides };
}

describe("scopedNoMatchRule (Spec §23, §25)", () => {
  it("produces REVIEW/notice/medium when a scoped rule has no matches", () => {
    const artifact = makeArtifact({
      path: "rules/api.mdc",
      scope: { patterns: ["components/**/*.tsx"] },
      content: "x",
    });
    const findings = scopedNoMatchRule.run(
      [artifact],
      ctx({ gitHistorySufficient: true, changedFilePaths: ["src/index.ts"] }),
    );

    expect(findings).toHaveLength(1);
    const f = findings[0]!;
    expect(f.type).toBe("scoped-no-match");
    expect(f.label).toBe("REVIEW");
    expect(f.severity).toBe("notice");
    expect(f.confidence).toBe("medium");
  });

  it("produces NO finding when a scoped pattern matches a changed file", () => {
    const artifact = makeArtifact({
      path: "rules/api.mdc",
      scope: { patterns: ["src/components/*.tsx"] },
      content: "x",
    });
    const findings = scopedNoMatchRule.run(
      [artifact],
      ctx({
        gitHistorySufficient: true,
        changedFilePaths: ["src/components/Button.tsx"],
      }),
    );
    expect(findings).toEqual([]);
  });

  it("skips all findings when Git history is insufficient (Rule 18)", () => {
    // Simulates a new/shallow repo where assessGitHistory returns sufficient=false.
    const artifact = makeArtifact({
      path: "rules/api.mdc",
      scope: { patterns: ["components/**/*.tsx"] },
      content: "x",
    });
    const findings = scopedNoMatchRule.run(
      [artifact],
      ctx({ gitHistorySufficient: false, changedFilePaths: [] }),
    );
    expect(findings).toEqual([]);
  });

  it("ignores artifacts without scoped patterns", () => {
    const artifact = makeArtifact({ path: "CLAUDE.md", content: "x" });
    const findings = scopedNoMatchRule.run(
      [artifact],
      ctx({ gitHistorySufficient: true, changedFilePaths: ["CLAUDE.md"] }),
    );
    expect(findings).toEqual([]);
  });

  it("frames as a review candidate, never labels it unused/obsolete (Rule 8, Rule 9)", () => {
    const artifact = makeArtifact({
      path: "rules/db.mdc",
      scope: { patterns: ["src/db/**"] },
      content: "x",
    });
    const f = scopedNoMatchRule.run(
      [artifact],
      ctx({ gitHistorySufficient: true, changedFilePaths: ["src/app.ts"] }),
    )[0]!;
    const text =
      `${f.title} ${f.description} ${f.recommendation ?? ""}`.toLowerCase();
    // Title/description never present the rule as actually unused/obsolete.
    expect(f.title.toLowerCase()).not.toContain("unused");
    expect(f.title.toLowerCase()).not.toContain("obsolete");
    expect(f.description.toLowerCase()).not.toContain("obsolete");
    // Review candidate framing, not a dead-rule claim.
    expect(text).toContain("does not mean");
    expect(text).toContain("review");
  });

  it("requires sufficient history even without explicit changed files", () => {
    const artifact = makeArtifact({
      path: "rules/x.mdc",
      scope: { patterns: ["src/x/**"] },
      content: "x",
    });
    // gitHistorySufficient omitted => undefined => falsy => skip.
    expect(scopedNoMatchRule.run([artifact], ctx())).toEqual([]);
  });
});
