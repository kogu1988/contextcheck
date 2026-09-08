import { describe, expect, it } from "vitest";

import { makeFinding, NORMATIVE_MAPPING } from "./mapping.js";

describe("NORMATIVE_MAPPING (Spec §10)", () => {
  it("maps every finding type to its normative label/severity/confidence", () => {
    expect(NORMATIVE_MAPPING.duplicate).toEqual({
      label: "INFO",
      severity: "info",
      confidence: "high",
    });
    expect(NORMATIVE_MAPPING.repetition).toEqual({
      label: "INFO",
      severity: "info",
      confidence: "medium",
    });
    expect(NORMATIVE_MAPPING["large-file"]).toEqual({
      label: "CONTEXT",
      severity: "info",
      confidence: "high",
    });
    expect(NORMATIVE_MAPPING["scoped-no-match"]).toEqual({
      label: "REVIEW",
      severity: "notice",
      confidence: "medium",
    });
    expect(NORMATIVE_MAPPING["high-stakes"]).toEqual({
      label: "CAUTION",
      severity: "notice",
      confidence: "medium",
    });
    expect(NORMATIVE_MAPPING["context-overhead"]).toEqual({
      label: "CONTEXT",
      severity: "info",
      confidence: "medium",
    });
  });
});

describe("makeFinding", () => {
  it("resolves label/severity/confidence from the type (Rule 17)", () => {
    const f = makeFinding({
      type: "high-stakes",
      filePaths: ["prod.mdc"],
      title: "High-stakes config",
      description: "x",
    });
    expect(f.label).toBe("CAUTION");
    expect(f.severity).toBe("notice");
    expect(f.confidence).toBe("medium");
  });

  it("produces a deterministic id", () => {
    const a = makeFinding({
      type: "duplicate",
      filePaths: ["a.md", "b.md"],
      title: "t",
      description: "d",
    });
    const b = makeFinding({
      type: "duplicate",
      filePaths: ["b.md", "a.md"],
      title: "t",
      description: "d",
    });
    expect(a.id).toBe(b.id);
  });

  it("copies filePaths array (defensive)", () => {
    const paths = ["a.md"];
    const f = makeFinding({
      type: "duplicate",
      filePaths: paths,
      title: "t",
      description: "d",
    });
    paths.push("b.md");
    expect(f.filePaths).toEqual(["a.md"]);
  });
});
