import { describe, expect, it } from "vitest";

import { repetitionRule } from "./repetition.js";
import { makeArtifact } from "../../../test/helpers/artifact.js";

const ctx = { rootPath: "/", options: {} as never };

describe("repetitionRule", () => {
  it("flags identical markdown sections across files (heading + content)", () => {
    const sections = [
      "## Code Style\n- use strict\n- no any\n",
      "## Testing\n- run vitest\n",
    ];
    const a = makeArtifact({ path: "A.md", content: sections.join("") });
    const b = makeArtifact({
      path: "B.md",
      content: `## Other\nintro\n\n${sections[0]}`,
    });

    const findings = repetitionRule.run([a, b], ctx);
    expect(findings).toHaveLength(1);

    const f = findings[0]!;
    expect(f.type).toBe("repetition");
    expect(f.label).toBe("INFO");
    expect(f.severity).toBe("info");
    expect(f.confidence).toBe("medium");
    expect(f.filePaths).toEqual(["A.md", "B.md"]);
  });

  it("uses plain-text block fallback for heading-less files (Rule 21)", () => {
    const a = makeArtifact({
      path: "a.cursorrules",
      content:
        "first meaningful rule about x\n\nsecond meaningful rule about y\n",
    });
    const b = makeArtifact({
      path: "b.cursorrules",
      content:
        "first meaningful rule about x\n\nthird meaningful rule about z\n",
    });

    const findings = repetitionRule.run([a, b], ctx);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.type).toBe("repetition");
  });

  it("does not flag semantically similar but textually different content (Rule 21)", () => {
    const a = makeArtifact({
      path: "a.md",
      content: "# Style\nAlways use camelCase\n",
    });
    const b = makeArtifact({
      path: "b.md",
      content: "# Style\nPrefer camelCase naming\n",
    });
    expect(repetitionRule.run([a, b], ctx)).toEqual([]);
  });

  it("ignores very short blocks in plain-text fallback", () => {
    const a = makeArtifact({ path: "a.cursorrules", content: "hi\n" });
    const b = makeArtifact({ path: "b.cursorrules", content: "hi\n" });
    // "hi" is below MIN_BLOCK_CHARS, so no repetition finding.
    expect(repetitionRule.run([a, b], ctx)).toEqual([]);
  });

  it("flags the same section repeated within one file", () => {
    const a = makeArtifact({
      path: "a.md",
      content: "## Same\nbody text here\n\n## Same\nbody text here\n",
    });
    const findings = repetitionRule.run([a], ctx);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.filePaths).toEqual(["a.md"]);
  });
});
