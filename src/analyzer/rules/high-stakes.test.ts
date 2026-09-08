import { describe, expect, it } from "vitest";

import {
  detectHighStakes,
  highStakesRule,
  matchContextualTerm,
  matchStrongTerm,
  STRONG_TERMS,
  CONTEXTUAL_TERMS,
} from "./high-stakes.js";
import { makeArtifact } from "../../../test/helpers/artifact.js";

const ctx = { rootPath: "/", options: {} as never };

describe("two-tier classification", () => {
  it("classifies strong vs contextual terms separately", () => {
    expect(STRONG_TERMS).toContain("credential");
    expect(STRONG_TERMS).toContain("password");
    expect(STRONG_TERMS).toContain("api key");
    expect(STRONG_TERMS).toContain("authentication");
    expect(STRONG_TERMS).toContain("authorization");
    expect(STRONG_TERMS).toContain("permission");
    expect(STRONG_TERMS).toContain("payment");
  });

  it("keeps weak terms out of the strong list", () => {
    for (const weak of CONTEXTUAL_TERMS) {
      expect(STRONG_TERMS).not.toContain(weak);
      expect(STRONG_TERMS).not.toContain(weak.replace(/s$/, ""));
    }
  });
});

describe("matchStrongTerm", () => {
  it("matches strong terms with word boundaries (plural-aware)", () => {
    expect(matchStrongTerm("Never log credentials.")).toBe("credential");
    expect(matchStrongTerm("Handle the password securely.")).toBe("password");
    expect(matchStrongTerm("Store the api key in env.")).toBe("api key");
    expect(matchStrongTerm("Require authentication.")).toBe("authentication");
  });

  it("does not match weak terms", () => {
    expect(matchStrongTerm("deploy to production")).toBeUndefined();
    expect(matchStrongTerm("security gateways")).toBeUndefined();
    expect(matchStrongTerm("the database migrates")).toBeUndefined();
  });
});

describe("pilot false-positive regression (REVISED behavior)", () => {
  const falsePositives = [
    {
      path: "CLAUDE.md",
      content: "Documentation is deployed to graphframes.io by CI.",
    },
    {
      path: "CLAUDE.md",
      content:
        "The master push triggers Netlify, which rebuilds and redeploys the docs.",
    },
    {
      path: "CLAUDE.md",
      content: "The build deployment scripts live in scripts/.",
    },
    { path: "CLAUDE.md", content: "usg.go is a Security Gateways module." },
    { path: "CLAUDE.md", content: "We use a production database for metrics." },
  ];

  for (const { path, content } of falsePositives) {
    it(`does NOT flag weak/contextual only content: "${content.slice(0, 40)}..."`, () => {
      const a = makeArtifact({ path, content });
      expect(detectHighStakes(a)).toBeUndefined();
      expect(highStakesRule.run([a], ctx)).toEqual([]);
    });
  }

  it("does NOT flag a file by its path name alone", () => {
    for (const path of [
      ".env.example",
      "config/auth.ts",
      "auth/middleware.ts",
      "secrets.md",
      "deployment.md",
      "payment/routes.ts",
    ]) {
      const a = makeArtifact({ path, content: "use arrow functions\n" });
      expect(detectHighStakes(a), path).toBeUndefined();
      expect(highStakesRule.run([a], ctx), path).toEqual([]);
    }
  });
});

describe("true positives (strong signal in content)", () => {
  const truePositives = [
    "Never commit API keys or credentials to the repository.",
    "Store the private key outside the repo.",
    "Rotate the access token before release.",
    "Ensure authentication is enforced on all routes.",
    "Grant authorization only after permission checks pass.",
    "Handle payment card credentials through a tokenizer.",
  ];

  for (const content of truePositives) {
    it(`flags strong content: "${content.slice(0, 44)}..."`, () => {
      const a = makeArtifact({ path: "CLAUDE.md", content });
      expect(detectHighStakes(a)).toBeTruthy();
      expect(highStakesRule.run([a], ctx)).toHaveLength(1);
    });
  }
});

describe("highStakesRule output", () => {
  it("emits CAUTION/notice/medium finding", () => {
    const f = highStakesRule.run(
      [
        makeArtifact({
          path: "CLAUDE.md",
          content: "Never commit credentials.",
        }),
      ],
      ctx,
    )[0]!;
    expect(f.type).toBe("high-stakes");
    expect(f.label).toBe("CAUTION");
    expect(f.severity).toBe("notice");
    expect(f.confidence).toBe("medium");
  });

  it("mentions the strong term and optional contextual reinforcement", () => {
    const f = highStakesRule.run(
      [
        makeArtifact({
          path: "auth.md",
          content: "Require authentication before production deploy.",
        }),
      ],
      ctx,
    )[0]!;
    expect(f.description).toContain("authentication");
    expect(f.description).toContain("reinforced by");
  });

  it("never uses critical/dangerous/unused wording (Spec §27)", () => {
    const f = highStakesRule.run(
      [
        makeArtifact({
          path: "payment.md",
          content: "Handle payments using credentials.",
        }),
      ],
      ctx,
    )[0]!;
    expect(`${f.title} ${f.description}`).toContain("Potentially high-stakes");
    expect(f.title.toLowerCase()).not.toContain("critical");
    expect(f.description.toLowerCase()).not.toContain("critical");
    expect(f.description.toLowerCase()).not.toContain("dangerous");
    expect(f.description.toLowerCase()).not.toContain("unused");
    expect(f.description.toLowerCase()).not.toContain("obsolete");
  });
});

describe("matchContextualTerm", () => {
  it("detects weak terms but they alone never trigger", () => {
    expect(matchContextualTerm("deploy to production")).toBe("deploy");
    expect(matchContextualTerm("security gateways")).toBe("security");
  });
});
