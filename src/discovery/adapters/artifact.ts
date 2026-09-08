/**
 * Shared artifact builder used by all adapters (Spec §12, §16).
 *
 * Keeps id generation, relative-path computation and metadata parsing DRY so
 * each adapter only concerns itself with what makes its format unique.
 */

import { relative, sep } from "node:path";
import { createHash } from "node:crypto";

import { parseConfiguration } from "../../parser/parse.js";
import { estimateTokens } from "../../tokens/estimator.js";
import { countLines } from "../scanner.js";
import type {
  ConfigurationArtifact,
  ConfigurationScope,
  ConfigurationType,
} from "../../types/configuration.js";

/** Re-exported for backward-compat; single source of truth is the estimator. */
export { estimateTokens } from "../../tokens/estimator.js";

/** Computes a deterministic artifact id from its path. */
export function artifactId(path: string): string {
  return `artifact_${createHash("sha1").update(path).digest("hex").slice(0, 8)}`;
}

export function toRelativePath(rootPath: string, absolutePath: string): string {
  return relative(rootPath, absolutePath).split(sep).join("/");
}

export interface BuildArtifactOptions {
  type: ConfigurationType;
  absolutePath: string;
  rootPath: string;
  content: string;
  /** Override scope; when omitted it is derived from the content's frontmatter. */
  scope?: ConfigurationScope;
}

export function buildArtifact(
  opts: BuildArtifactOptions,
): ConfigurationArtifact {
  const { type, absolutePath, rootPath, content, scope } = opts;

  const path = toRelativePath(rootPath, absolutePath);
  const lineCount = countLines(content);
  // Default scope is derived from the file's own frontmatter (Spec §16/§17).
  const resolvedScope = scope ?? parseConfiguration(content).scope;

  return {
    id: artifactId(path),
    type,
    path,
    content,
    scope: resolvedScope,
    metadata: {
      sizeBytes: Buffer.byteLength(content, "utf8"),
      estimatedTokens: estimateTokens(content),
      lineCount,
    },
  };
}
