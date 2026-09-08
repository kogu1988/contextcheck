/**
 * High-stakes detection (Spec §26, §27, Rule 20).
 *
 * Considers three sources:
 *   1. file path
 *   2. scope/glob patterns
 *   3. file content
 *
 * Keyword matching is case-insensitive. This is NOT a security classifier and
 * never uses terms like "critical" or "dangerous"; it surfaces a review
 * candidate: "Potentially high-stakes" + "Review manually before modifying".
 */

import type { ConfigurationArtifact } from "../../types/configuration.js";
import type { AnalyzerRule } from "../types.js";
import { makeFinding } from "./mapping.js";

/** Keyword categories (Spec §26). Case-insensitive substring match. */
export const HIGH_STAKES_KEYWORDS: readonly string[] = [
  "security",
  "auth",
  "authentication",
  "authorization",
  "permission",
  "permissions",
  "secret",
  "secrets",
  "credential",
  "credentials",
  "payment",
  "payments",
  "billing",
  "deploy",
  "deployment",
  "production",
  "database",
  "migration",
  "infrastructure",
];

/** Finds which keywords appear in a lowercased haystack. */
export function matchKeywords(text: string): string[] {
  const lower = text.toLowerCase();
  const found = HIGH_STAKES_KEYWORDS.filter((k) => lower.includes(k));
  return [...new Set(found)];
}

export const highStakesRule: AnalyzerRule = {
  name: "high-stakes",
  run(artifacts) {
    const findings = [];

    for (const artifact of artifacts) {
      const keyword = detectHighStakes(artifact);
      if (!keyword) continue;

      findings.push(
        makeFinding({
          type: "high-stakes",
          filePaths: [artifact.path],
          title: "Potentially high-stakes configuration",
          description:
            `${artifact.path} appears related to "${keyword}". Potentially ` +
            `high-stakes configuration detected: this instruction may be low ` +
            `frequency but important. Review manually before modifying or removing it.`,
          recommendation:
            `Before changing or removing this rule, confirm its scope and ` +
            `purpose with context of the related system.`,
        }),
      );
    }

    return findings;
  },
};

/**
 * Returns the first matched keyword, or undefined. Investigates path, scope
 * patterns and content, all case-insensitively (Rule 20).
 */
export function detectHighStakes(
  artifact: ConfigurationArtifact,
): string | undefined {
  const sources: string[] = [artifact.path];
  if (artifact.scope?.patterns) {
    sources.push(...artifact.scope.patterns);
  }
  sources.push(artifact.content);

  for (const source of sources) {
    const matched = matchKeywords(source);
    if (matched.length > 0) {
      return matched[0];
    }
  }

  return undefined;
}
