/**
 * Adapter port (Spec §50).
 *
 * Platform-specific behavior — which files each tool uses and how they are
 * parsed — lives inside an adapter (Rule 14). The discovery engine and
 * analyzer never hard-code tool-specific logic.
 */

import type { ConfigurationArtifact } from "../../types/configuration.js";

export interface ConfigurationAdapter {
  /** Stable identifier, e.g. "claude". */
  name: string;

  /**
   * Returns true if this adapter owns the given file path (relative to the
   * repository root).
   */
  matches(relativePath: string): boolean;

  /**
   * Parses a discovered file into a normalized artifact. Must not depend on
   * any discovery state; safe to call for any file it owns.
   */
  parse(filePath: string, rootPath: string): Promise<ConfigurationArtifact>;
}
