/**
 * Normalized configuration model (Spec §16).
 *
 * Platform-specific files (CLAUDE.md, AGENTS.md, SKILL.md, .cursorrules,
 * .cursor/rules/**) are normalized into this common shape so that analyzers
 * and renderers never need to know which tool produced them.
 */

/**
 * The kind of configuration artifact. Determines how the analyzer treats it
 * and how the renderer labels it in output.
 */
export type ConfigurationType =
  "rule" | "skill" | "instruction" | "agent-config" | "unknown";

/**
 * Declares when/where a configuration applies. Populated from glob patterns
 * and platform-specific "always apply" flags.
 */
export interface ConfigurationScope {
  /** Glob patterns this configuration targets (e.g. `components/**\/*.tsx`). */
  patterns?: string[];
  /** Whether the configuration always applies regardless of path. */
  alwaysApply?: boolean;
}

/** Lightweight metrics computed during parsing/normalization. */
export interface ArtifactMetadata {
  /** Exact byte size on disk. */
  sizeBytes: number;
  /** Token estimate (`chars / 4`). Filled by the token estimator (Phase 3). */
  estimatedTokens: number;
  /** Number of lines in the file. */
  lineCount: number;
}

/**
 * Internal representation of a discovered configuration file.
 *
 * NOTE: this is the full model including raw `content`. Never serialize this
 * directly to JSON/CI output — use a privacy-safe DTO instead (Spec §33).
 */
export interface ConfigurationArtifact {
  id: string;
  type: ConfigurationType;
  /** Path relative to the repository root. */
  path: string;
  /** Raw file content. Used only in-memory by analyzers. */
  content: string;

  scope?: ConfigurationScope;

  metadata: ArtifactMetadata;
}
