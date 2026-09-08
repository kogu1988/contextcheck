import { describe, expect, it } from "vitest";

import { largeFileRule, formatTokens } from "./large-file.js";
import type { AnalysisContext } from "../types.js";
import { DEFAULT_ANALYSIS_OPTIONS } from "../types.js";
import { makeArtifact } from "../../../test/helpers/artifact.js";

const context: AnalysisContext = {
  rootPath: "/repo",
  options: DEFAULT_ANALYSIS_OPTIONS,
};

describe("largeFileRule", () => {
  it("flags files above the threshold with CONTEXT/info/high (Spec §20)", () => {
    // content word: estimateTokens = chars/4. Need > 2000 tokens => > 8000 chars.
    const bigContent = "x".repeat(8200);
    const smallContent = "small".repeat(40);

    const artifacts = [
      makeArtifact({ path: "CLAUDE.md", content: bigContent }),
      makeArtifact({ path: "AGENTS.md", content: smallContent }),
    ];

    const findings = largeFileRule.run(artifacts, context);
    expect(findings).toHaveLength(1);

    const f = findings[0]!;
    expect(f.type).toBe("large-file");
    expect(f.label).toBe("CONTEXT");
    expect(f.severity).toBe("info");
    expect(f.confidence).toBe("high");
    expect(f.filePaths).toEqual(["CLAUDE.md"]);
    expect(f.description).toContain("~2,050 tokens");
  });

  it("produces no findings below the threshold", () => {
    const artifacts = [
      makeArtifact({ path: "AGENTS.md", content: "a".repeat(800) }),
    ];
    expect(largeFileRule.run(artifacts, context)).toEqual([]);
  });

  it("respects a custom threshold from options", () => {
    const artifacts = [
      makeArtifact({ path: "x.md", content: "a".repeat(2000) }),
    ];
    // 2000/4 = 500 tokens; default 2000 threshold would NOT flag it, custom 100 would.
    const findings = largeFileRule.run(artifacts, {
      ...context,
      options: { ...DEFAULT_ANALYSIS_OPTIONS, largeFileTokens: 100 },
    });
    expect(findings).toHaveLength(1);
  });

  it("formats token counts with separators", () => {
    expect(formatTokens(4800)).toBe("4,800");
    expect(formatTokens(2050)).toBe("2,050");
  });
});
