import { describe, expect, it } from "vitest";

import { estimateTokens } from "./estimator.js";

describe("estimateTokens", () => {
  it("estimates 4 chars per token (Spec §21)", () => {
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("aaaaaaaaaaaa")).toBe(3);
    expect(estimateTokens("")).toBe(0);
  });

  it("rounds to the nearest integer", () => {
    expect(estimateTokens("abcdefgh")).toBe(2); // 8/4 = 2 exact
    expect(estimateTokens("abcd ef")).toBe(2); // 7/4 = 1.75 -> 2
    expect(estimateTokens("abcdef")).toBe(2); // 6/4 = 1.5 -> 2 (round half up)
    expect(estimateTokens("abc")).toBe(1); // 3/4 = 0.75 -> 1
  });

  it("is deterministic", () => {
    expect(estimateTokens("some rule text")).toBe(
      estimateTokens("some rule text"),
    );
  });
});
