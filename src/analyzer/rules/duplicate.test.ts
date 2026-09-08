import { describe, expect, it } from "vitest";

import { duplicateRule, bodyFingerprint } from "./duplicate.js";
import { makeArtifact } from "../../../test/helpers/artifact.js";

describe("duplicateRule", () => {
  it("detects exact duplicates across files as one finding (Spec §19)", () => {
    const artifacts = [
      makeArtifact({
        path: "CLAUDE.md",
        content: "# Rules\n\n- be nice\n- use types\n",
      }),
      makeArtifact({
        path: "AGENTS.md",
        content: "# Rules\n\n- be nice\n- use types\n",
      }),
      makeArtifact({
        path: "SKILL.md",
        content: "# Different\n\n- something else\n",
      }),
    ];

    const findings = duplicateRule.run(artifacts, {
      rootPath: "/repo",
      options: {} as never,
    });
    expect(findings).toHaveLength(1);

    const f = findings[0]!;
    expect(f.type).toBe("duplicate");
    expect(f.label).toBe("INFO");
    expect(f.severity).toBe("info");
    expect(f.confidence).toBe("high");
    expect(f.filePaths).toEqual(["AGENTS.md", "CLAUDE.md"]);
    expect(f.filePaths).toHaveLength(2);
  });

  it("strips YAML frontmatter before comparing bodies (Rule 22)", () => {
    // Identical body, DIFFERENT frontmatter -> still a duplicate candidate.
    const a = makeArtifact({
      path: "a.mdc",
      content:
        "---\ndescription: one\nglobs: [a/*]\n---\n# Body\nsame body here\n",
    });
    const b = makeArtifact({
      path: "b.mdc",
      content:
        "---\ndescription: two\nalwaysApply: true\n---\n# Body\nsame body here\n",
    });

    const findings = duplicateRule.run([a, b], {
      rootPath: "/",
      options: {} as never,
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]!.filePaths).toEqual(["a.mdc", "b.mdc"]);
  });

  it("does NOT treat differing bodies as duplicates", () => {
    const a = makeArtifact({ path: "a.md", content: "# A\ncontent one\n" });
    const b = makeArtifact({ path: "b.md", content: "# B\ncontent two\n" });
    expect(
      duplicateRule.run([a, b], { rootPath: "/", options: {} as never }),
    ).toEqual([]);
  });

  it("recognizes duplicates regardless of whitespace/case/line-endings (normalization)", () => {
    const a = makeArtifact({
      path: "a.md",
      content: "# H\n\nLINE one   two\n",
    });
    const b = makeArtifact({
      path: "b.md",
      content: "# h\n\nline one two\r\n",
    });
    const findings = duplicateRule.run([a, b], {
      rootPath: "/",
      options: {} as never,
    });
    expect(findings).toHaveLength(1);
  });

  it("produces stable fingerprints (deterministic)", () => {
    const a = makeArtifact({ path: "a.md", content: "# X\nbody\n" });
    expect(bodyFingerprint(a)).toBe(
      bodyFingerprint(makeArtifact({ path: "b.md", content: "# X\nbody\n" })),
    );
  });
});
