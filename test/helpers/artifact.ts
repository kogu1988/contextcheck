/**
 * Test helpers for building ConfigurationArtifact fixtures.
 */

import type {
  ConfigurationArtifact,
  ConfigurationType,
} from "../../src/types/configuration.js";
import { estimateTokens } from "../../src/discovery/adapters/artifact.js";

let counter = 0;

export function makeArtifact(partial: {
  path: string;
  content: string;
  type?: ConfigurationType;
  scope?: ConfigurationArtifact["scope"];
}): ConfigurationArtifact {
  counter += 1;
  const type = partial.type ?? "instruction";
  const content = partial.content;
  const lineCount =
    content.length === 0 ? 0 : content.split(/\r\n|[\r\n]/).length;
  return {
    id: `artifact_${counter}`,
    type,
    path: partial.path,
    content,
    scope: partial.scope,
    metadata: {
      sizeBytes: Buffer.byteLength(content, "utf8"),
      estimatedTokens: estimateTokens(content),
      lineCount,
    },
  };
}
