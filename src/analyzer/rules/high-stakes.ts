/**
 * High-stakes detection (Spec §26, §27, Rule 20) — REVISED after real-world
 * pilot, two-tier model.
 *
 * Tier 1 (STRONG): a single strong term in CONTENT alone justifies CAUTION
 *   e.g. secret, credential, password, authentication, authorization,
 *   permission, payment, private key, api key, access token.
 *
 * Tier 2 (CONTEXTUAL): weaker terms (deploy, production, security, database,
 *   billing, infrastructure, migration) NEVER trigger a finding on their own.
 *   They may only reinforce a strong signal, never substitute for it. This
 *   removes the pilot's false positives ("docs deployed", "security gateways",
 *   "deployment scripts").
 *
 * Path/scope names are never the sole trigger: `.env.example`, `config/auth.ts`,
 * `deployment.md` must not produce CAUTION by naming alone.
 *
 * Practically: a finding is produced iff a STRONG term is present in a rule's
 * content. CONTEXTUAL entries are retained as reinforcement only.
 */

import type { ConfigurationArtifact } from "../../types/configuration.js";
import type { AnalyzerRule } from "../types.js";
import { makeFinding } from "./mapping.js";

/** Strong terms that alone justify a CAUTION finding (word-boundary match). */
export const STRONG_TERMS: readonly string[] = [
  "secret",
  "credential",
  "password",
  "authentication",
  "authorization",
  "permission",
  "payment",
  "api key",
  "private key",
  "access token",
];

/** Contextual terms that NEVER trigger alone (Spec §26 weak categories). */
export const CONTEXTUAL_TERMS: readonly string[] = [
  "deploy",
  "deployment",
  "production",
  "security",
  "database",
  "billing",
  "infrastructure",
  "migration",
];

/**
 * Escapes a literal and anchors it to whole-word boundaries. Single-word terms
 * accept an optional trailing `s` so (credential/credentials) both match.
 */
function termPattern(term: string): RegExp {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const plural = term.includes(" ") ? escaped : `${escaped}(?:s|es)?`;
  return new RegExp(`\\b${plural}\\b`, "i");
}

/** Returns the first STRONG term present in `text`, or undefined. */
export function matchStrongTerm(text: string): string | undefined {
  return STRONG_TERMS.find((term) => termPattern(term).test(text));
}

/** Returns the first CONTEXTUAL term present in `text`, or undefined. */
export function matchContextualTerm(text: string): string | undefined {
  return CONTEXTUAL_TERMS.find((term) => termPattern(term).test(text));
}

export const highStakesRule: AnalyzerRule = {
  name: "high-stakes",
  run(artifacts) {
    const findings = [];

    for (const artifact of artifacts) {
      const strong = matchStrongTerm(artifact.content);
      if (!strong) continue;

      // A contextual term can only reinforce a strong signal; it is never sufficient.
      const context = matchContextualTerm(artifact.content);
      const why = context ? `(reinforced by "${context}")` : "";

      findings.push(
        makeFinding({
          type: "high-stakes",
          filePaths: [artifact.path],
          title: "Potentially high-stakes configuration",
          description:
            `${artifact.path} contains a strong high-stakes signal related to ` +
            `"${strong}" ${why}. Potentially high-stakes configuration detected: ` +
            `this instruction may be low frequency but important. Review manually ` +
            `before modifying or removing it.`,
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
 * Returns the matched STRONG term, or undefined. Detection is content-driven
 * (Rule 20 still reads the artifact, but path/scope names never trigger alone).
 */
export function detectHighStakes(
  artifact: ConfigurationArtifact,
): string | undefined {
  return matchStrongTerm(artifact.content);
}
