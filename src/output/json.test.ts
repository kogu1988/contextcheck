import { describe, expect, it } from "vitest";

import { serializeReport, toReportJson, toArtifactJson } from "./json.js";
import type { AnalysisReport } from "../types/report.js";
import { makeArtifact } from "../../test/helpers/artifact.js";

function makeReport(): AnalysisReport {
  const artifact = makeArtifact({
    path: "CLAUDE.md",
    content: "# Secret\nAPI_KEY=abc123\nvery sensitive content\n",
  });
  return {
    summary: {
      configurationFiles: 1,
      skills: 0,
      estimatedTokens: 10,
      potentialContextOverhead: 0,
    },
    artifacts: [artifact],
    findings: [],
  };
}

describe("JSON privacy (Rule 23, Rule 25)", () => {
  it("default JSON output contains artifact metadata but no raw content", () => {
    const json = serializeReport(makeReport());
    const parsed = JSON.parse(json);

    expect(json).not.toContain("very sensitive content");
    expect(json).not.toContain("API_KEY");
    expect(json).not.toContain("content");
    expect(parsed.artifacts[0]).toEqual({
      id: expect.any(String),
      type: "instruction",
      path: "CLAUDE.md",
      scope: undefined,
      metadata: {
        sizeBytes: expect.any(Number),
        estimatedTokens: expect.any(Number),
        lineCount: expect.any(Number),
      },
    });
  });

  it("toArtifactJson never includes the content field (structurally)", () => {
    const artifact = makeArtifact({ path: "a.md", content: "secret body" });
    const dto = toArtifactJson(artifact);
    expect("content" in (dto as Record<string, unknown>)).toBe(false);
  });

  it("toReportJson keeps findings and summary intact", () => {
    const report = makeReport();
    const json = toReportJson(report);
    expect(json.summary.configurationFiles).toBe(1);
    expect(json.artifacts).toHaveLength(1);
    expect(json.findings).toEqual([]);
  });

  it("serializes an explicit scope in the DTO", () => {
    const artifact = makeArtifact({
      path: "x.mdc",
      content: "body",
      scope: { patterns: ["src/db/**"], alwaysApply: false },
    });
    const dto = toArtifactJson(artifact);
    expect(dto.scope).toEqual({ patterns: ["src/db/**"], alwaysApply: false });
  });
});
