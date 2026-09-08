import { describe, expect, it } from "vitest";

import {
  detectHighStakes,
  highStakesRule,
  matchKeywords,
} from "./high-stakes.js";
import { makeArtifact } from "../../../test/helpers/artifact.js";

const ctx = { rootPath: "/", options: {} as never };

describe("matchKeywords", () => {
  it("is case-insensitive", () => {
    expect(matchKeywords("Deploy to PRODUCTION")).toContain("deploy");
    expect(matchKeywords("Deploy to PRODUCTION")).toContain("production");
  });

  it("is empty for no keyword", () => {
    expect(matchKeywords("use styled components")).toEqual([]);
  });
});

describe("detectHighStakes (Rule 20: path + scope + content)", () => {
  it("detects from file path", () => {
    const a = makeArtifact({
      path: "production.mdc",
      content: "generic text\n",
    });
    expect(detectHighStakes(a)).toBe("production");
  });

  it("detects from scope/glob patterns", () => {
    const a = makeArtifact({
      path: "rules/db.mdc",
      scope: { patterns: ["src/auth/**/*.ts"] },
      content: "generic\n",
    });
    expect(detectHighStakes(a)).toBe("auth");
  });

  it("detects from content", () => {
    const a = makeArtifact({
      path: "rules/code.mdc",
      content: "Never log credentials.\n",
    });
    // 'credential' appears before 'credentials' in the keyword list; either is valid.
    expect(["credential", "credentials"]).toContain(detectHighStakes(a));
  });

  it("returns undefined when no keyword anywhere", () => {
    const a = makeArtifact({
      path: "rules/code.mdc",
      content: "Use arrow functions.\n",
    });
    expect(detectHighStakes(a)).toBeUndefined();
  });
});

describe("highStakesRule", () => {
  it("emits CAUTION/notice/medium finding", () => {
    const a = makeArtifact({
      path: "deploy.mdc",
      content: "run migrations before deploy\n",
    });
    const findings = highStakesRule.run([a], ctx);

    expect(findings).toHaveLength(1);
    const f = findings[0]!;
    expect(f.type).toBe("high-stakes");
    expect(f.label).toBe("CAUTION");
    expect(f.severity).toBe("notice");
    expect(f.confidence).toBe("medium");
  });

  it("never uses critical/dangerous/unused wording (Spec §27)", () => {
    const a = makeArtifact({
      path: "payment.mdc",
      content: "handle payments\n",
    });
    const f = highStakesRule.run([a], ctx)[0]!;
    expect(`${f.title} ${f.description}`).toContain("Potentially high-stakes");
    expect(f.title.toLowerCase()).not.toContain("critical");
    expect(f.description.toLowerCase()).not.toContain("critical");
    expect(f.description.toLowerCase()).not.toContain("dangerous");
    expect(f.description.toLowerCase()).not.toContain("unused");
    expect(f.description.toLowerCase()).not.toContain("obsolete");
  });

  it("does not flag non-high-stakes files", () => {
    const a = makeArtifact({ path: "style.mdc", content: "prefer tabs\n" });
    expect(highStakesRule.run([a], ctx)).toEqual([]);
  });
});
