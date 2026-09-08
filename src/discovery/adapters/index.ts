/**
 * Registers every supported adapter (Spec §14, §49).
 *
 * The discovery engine iterates this list in order. The first adapter whose
 * `matches` returns true owns the file.
 */

import { agentsAdapter } from "./agents.js";
import { claudeAdapter } from "./claude.js";
import { cursorAdapter } from "./cursor.js";
import { skillAdapter } from "./skill.js";
import type { ConfigurationAdapter } from "./types.js";

export const adapters: readonly ConfigurationAdapter[] = [
  claudeAdapter,
  agentsAdapter,
  skillAdapter,
  cursorAdapter,
];

export type { ConfigurationAdapter } from "./types.js";
export {
  artifactId,
  buildArtifact,
  estimateTokens,
  toRelativePath,
} from "./artifact.js";
