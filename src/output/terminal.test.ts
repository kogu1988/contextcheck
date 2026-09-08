import { describe, expect, it } from "vitest";

import { renderCompactReport, renderReport } from "./terminal.js";
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
    expect(out).toContain("Run `context-check analyze --verbose` for details.");
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
    expect(verbose).not.toContain("Run `context-check analyze`");
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

describe("renderCompactReport", () => {
  const report: AnalysisReport = {
    summary: {
      configurationFiles: 5,
      skills: 0,
      estimatedTokens: 7840,
      potentialContextOverhead: 210,
    },
    artifacts: [],
    findings: [
      makeFinding({
        type: "large-file",
        filePaths: [".cursor/rules/frontend.mdc"],
        title: "Instruction file is unusually large",
        description: "~2,430 tokens",
      }),
      makeFinding({
        type: "high-stakes",
        filePaths: ["CLAUDE.md"],
        title: "Potentially high-stakes configuration",
        description: "x",
      }),
    ],
  };

  it("answers count, size and attention quickly", () => {
    const out = renderCompactReport(report);
    expect(out).toContain("ContextCheck");
    expect(out).toContain("5 configuration files");
    expect(out).toContain("~7,840 estimated tokens");
    expect(out).toContain("2 findings");
    expect(out).toContain("[CONTEXT] Instruction file is unusually large");
    expect(out).toContain(".cursor/rules/frontend.mdc");
    expect(out).toContain("Summary: 5 files · 7,840 tokens · 2 findings");
  });

  it("uses correct singular/plural for findings", () => {
    const one = renderCompactReport({
      ...report,
      findings: report.findings.slice(0, 1),
    });
    expect(one).toContain("1 finding");
    expect(one).not.toContain("1 findings");
  });

  it("never claims wasted tokens or causal impact", () => {
    const out = renderCompactReport(report);
    expect(out.toLowerCase()).not.toContain("wasted");
    expect(out.toLowerCase()).not.toContain("%8");
  });
});
