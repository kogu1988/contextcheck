import { describe, expect, it } from "vitest";

import {
  isValidFailThreshold,
  maxSeverity,
  shouldFailOnSeverity,
} from "./severity.js";
import type { Finding, FindingSeverity } from "../types/finding.js";

// Build a finding directly (not via factory) so we can set arbitrary severity
// for exit-code semantics; the normative mapping is covered elsewhere.
function mk(severity: FindingSeverity): Finding {
  return {
    id: "f",
    type: "duplicate",
    label: "INFO",
    severity,
    confidence: "high",
    filePaths: ["a.md"],
    title: "t",
    description: "d",
  };
}

describe("shouldFailOnSeverity", () => {
  it("never fails without findings (always exit 0)", () => {
    expect(shouldFailOnSeverity([], "info")).toBe(false);
    expect(shouldFailOnSeverity([], "notice")).toBe(false);
  });

  it("only-info findings stay informational (default -> no fail)", () => {
    const findings = [mk("info")];
    expect(shouldFailOnSeverity(findings, "notice")).toBe(false);
    expect(shouldFailOnSeverity(findings, "warning")).toBe(false);
    expect(shouldFailOnSeverity(findings, "info")).toBe(true);
  });

  it("notice findings fail on --fail-on notice but not warning", () => {
    const findings = [mk("notice")];
    expect(shouldFailOnSeverity(findings, "notice")).toBe(true);
    expect(shouldFailOnSeverity(findings, "warning")).toBe(false);
  });

  it("warning findings fail on any threshold at or below", () => {
    const findings = [mk("warning")];
    expect(shouldFailOnSeverity(findings, "info")).toBe(true);
    expect(shouldFailOnSeverity(findings, "notice")).toBe(true);
    expect(shouldFailOnSeverity(findings, "warning")).toBe(true);
  });

  it("mixed findings fail when any reaches the threshold", () => {
    const findings = [mk("info"), mk("notice")];
    expect(shouldFailOnSeverity(findings, "notice")).toBe(true);
    expect(shouldFailOnSeverity(findings, "info")).toBe(true);
  });
});

describe("maxSeverity", () => {
  it("returns the highest severity, info for empty", () => {
    expect(maxSeverity([mk("info"), mk("notice")])).toBe("notice");
    expect(maxSeverity([mk("info")])).toBe("info");
    expect(maxSeverity([])).toBe("info");
  });
});

describe("isValidFailThreshold", () => {
  it("validates severity values, rejects labels", () => {
    expect(isValidFailThreshold("info")).toBe(true);
    expect(isValidFailThreshold("notice")).toBe(true);
    expect(isValidFailThreshold("warning")).toBe(true);
    expect(isValidFailThreshold("review")).toBe(false);
    expect(isValidFailThreshold("bogus")).toBe(false);
  });
});
