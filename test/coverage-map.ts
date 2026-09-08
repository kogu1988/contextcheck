/**
 * Spec §58 coverage map.
 *
 * This is not a runtime test; it documents the required regression scenarios
 * and maps each to the concrete test file that covers it, so coverage is
 * auditable at a glance.
 *
 * Required (Spec §58)           -> Test file
 * ------------------------------------------------------------------
 * Duplicate with frontmatter    -> src/analyzer/rules/duplicate.test.ts
 * New repository                -> src/analyzer/rules/scoped-no-match.test.ts (Rule 18)
 *                                   + test/scoped-git-e2e.test.ts (insufficient)
 * Shallow repository            -> test/git-regression.test.ts (Rule 26)
 * No Git                        -> src/analyzer/run.test.ts (Spec §34)
 * Third-party directory         -> test/discovery-fixtures.test.ts (§15, Rule 19)
 * Cross-file duplicate          -> src/analyzer/rules/duplicate.test.ts (Rule 16)
 * Plain-text rule               -> src/analyzer/rules/repetition.test.ts (Rule 21)
 * High-stakes rule              -> src/analyzer/rules/high-stakes.test.ts (Rule 20)
 * JSON privacy                  -> src/output/json.test.ts (Rule 23, Rule 25)
 */
export const specCoverage = {
  suite:
    "Duplicate with frontmatter, New repository, Shallow repository, No Git, " +
    "Third-party directory, Cross-file duplicate, Plain-text rule, High-stakes rule, JSON privacy",
} as const;

export const REQUIRED_TEST_FILES = [
  "src/analyzer/rules/duplicate.test.ts",
  "src/analyzer/rules/repetition.test.ts",
  "src/analyzer/rules/large-file.test.ts",
  "src/analyzer/rules/high-stakes.test.ts",
  "src/analyzer/rules/scoped-no-match.test.ts",
  "src/git/sufficiency.test.ts",
  "src/output/json.test.ts",
] as const;
