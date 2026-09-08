import { describe, expect, it } from "vitest";

import {
  buildContextOverheadFinding,
  estimateOverhead,
} from "./context-overhead.js";
import { makeFinding } from "./mapping.js";
import { makeArtifact } from "../../../test/helpers/artifact.js";

describe("estimateOverhead (Spec §22)", () => {
  it("estimates overhead from duplicate copies beyond the first", () => {
    const artifacts = [
      makeArtifact({ path: "a.md", content: "x".repeat(800) }), // 200 tokens
      makeArtifact({ path: "b.md", content: "x".repeat(800) }), // 200 tokens
    ];
    const dup = makeFinding({
      type: "duplicate",
      filePaths: ["a.md", "b.md"],
      title: "d",
      description: "d",
    });

    // 1 extra copy at ~200 avg tokens.
    expect(estimateOverhead(artifacts, [dup])).toBe(200);
  });

  it("adds a bounded contribution for repetitions", () => {
    const rep = makeFinding({
      type: "repetition",
      filePaths: ["a.md", "b.md"],
      title: "r",
      description: "r",
    });
    // 200 * 2 = 400.
    expect(estimateOverhead([], [rep])).toBe(400);
  });

  it("is zero without redundancy findings", () => {
    expect(estimateOverhead([], [])).toBe(0);
  });
});

describe("buildContextOverheadFinding", () => {
  it("returns a finding when overhead is meaningful", () => {
    const f = buildContextOverheadFinding(4210, ["a.md", "b.md"]);
    expect(f).not.toBeNull();
    expect(f!.type).toBe("context-overhead");
    expect(f!.label).toBe("CONTEXT");
    expect(f!.severity).toBe("info");
    expect(f!.confidence).toBe("medium");
    expect(f!.description).toContain("~4,210 tokens");
    expect(f!.description).toContain("Potential Context Overhead");
  });

  it("returns null for negligible overhead (avoids noise)", () => {
    expect(buildContextOverheadFinding(0, ["a.md"])).toBeNull();
  });

  it("never uses the phrase 'wasted tokens' (Spec §22)", () => {
    const f = buildContextOverheadFinding(100, ["a.md"])!;
    const text = f.description.toLowerCase();
    expect(text).not.toContain("wasted");
  });
});
