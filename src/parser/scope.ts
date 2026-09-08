/**
 * Scope normalization (Spec §16, §17).
 *
 * Reads a parsed frontmatter object and produces a `ConfigurationScope`:
 * - `patterns`: from `globs` (an array of strings, or a single string)
 * - `alwaysApply`: a boolean flag
 *
 * Unknown/malformed values are ignored rather than guessed; the analyzer
 * still treats the artifact as unscoped rather than inventing precision.
 */

import type { ConfigurationScope } from "../types/configuration.js";

/** Normalizes `globs` from YAML into a string array. */
export function parsePatterns(value: unknown): string[] | undefined {
  if (typeof value === "string" && value.trim().length > 0) {
    return [value.trim()];
  }
  if (Array.isArray(value)) {
    const patterns = value.filter(
      (v): v is string => typeof v === "string" && v.trim().length > 0,
    );
    return patterns.length > 0 ? patterns : undefined;
  }
  return undefined;
}

/** Normalizes `alwaysApply` from YAML into a boolean. */
export function parseAlwaysApply(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

/**
 * Builds a `ConfigurationScope` from parsed frontmatter data. Returns
 * undefined when no usable scope information is present.
 */
export function parseScope(
  data: Record<string, unknown> | undefined,
): ConfigurationScope | undefined {
  if (!data) return undefined;

  const patterns = parsePatterns(data["globs"]);
  const alwaysApply = parseAlwaysApply(data["alwaysApply"]);

  if (patterns === undefined && alwaysApply === undefined) return undefined;

  const scope: ConfigurationScope = {};
  if (patterns !== undefined) scope.patterns = patterns;
  if (alwaysApply !== undefined) scope.alwaysApply = alwaysApply;
  return scope;
}
