import { describe, expect, it } from "vitest";

import { renderReport } from "./terminal.js";
import { makeFinding } from "../analyzer/rules/mapping.js";
import type { AnalysisReport } from "../types/report.js";

describe("renderReport", () => {
  it("renders the summary and finding labels", () => {
    const report: AnalysisReport = {
      summary: {
        configurationFiles: 23,
        skills: 8,
        estimatedTokens: 14820,
        potentialContextOverhead: 4210,
      },
      artifacts: [],
      findings: [
        makeFinding({
          type: "large-file",
          filePaths: ["CLAUDE.md"],
          title: "Large file",
          description: "desc",
        }),
        makeFinding({
          type: "scoped-no-match",
          filePaths: ["x.mdc"],
          title: "No match",
          description: "desc",
        }),
        makeFinding({
          type: "high-stakes",
          filePaths: ["y.mdc"],
          title: "High stakes",
          description: "desc",
        }),
      ],
    };

    const out = renderReport(report);
    expect(out).toContain("23");
    expect(out).toContain("Potential Context Overhead");
    expect(out).toContain("~4,210 tokens");
    expect(out).toContain("[CONTEXT] Large file");
    expect(out).toContain("[REVIEW] No match");
    expect(out).toContain("[CAUTION] High stakes");
    expect(out).toContain("Run `contextcheck analyze --verbose` for details.");
  });

  it("verbose includes descriptions and recommendations", () => {
    const report: AnalysisReport = {
      summary: {
        configurationFiles: 1,
        skills: 0,
        estimatedTokens: 10,
        potentialContextOverhead: 0,
      },
      artifacts: [],
      findings: [
        makeFinding({
          type: "duplicate",
          filePaths: ["a.md", "b.md"],
          title: "Duplicate",
          description: "identical bodies found",
          recommendation: "consolidate",
        }),
      ],
    };

    const verbose = renderReport(report, true);
    expect(verbose).toContain("identical bodies found");
    expect(verbose).toContain("consolidate");
    expect(verbose).not.toContain("Run `contextcheck analyze`");
  });

  it("never claims wasted tokens or causal impact (Spec §22, §4.5)", () => {
    const report: AnalysisReport = {
      summary: {
        configurationFiles: 1,
        skills: 0,
        estimatedTokens: 100,
        potentialContextOverhead: 50,
      },
      artifacts: [],
      findings: [],
    };
    const out = renderReport(report);
    expect(out.toLowerCase()).not.toContain("wasted");
    expect(out.toLowerCase()).not.toContain("%8");
    expect(out.toLowerCase()).not.toContain("better");
  });
});
