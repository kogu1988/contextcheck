/**
 * Discovery engine (Spec §14, §49).
 *
 * Combines the filesystem scanner with every registered adapter to produce a
 * normalized list of configuration artifacts for a repository root.
 *
 * Pipeline:
 *   walk files (skipping excluded dirs)
 *     -> first matching adapter owns the file
 *     -> parse into a ConfigurationArtifact
 */

import { adapters } from "./adapters/index.js";
import type { ConfigurationAdapter } from "./adapters/types.js";
import { walkFiles, type DiscoveredFile } from "./scanner.js";
import type { ConfigurationArtifact } from "../types/configuration.js";

export interface DiscoveryResult {
  artifacts: ConfigurationArtifact[];
  /** Paths recognized as configuration but not parsed for any reason. */
  skipped: string[];
  /** Files whose ownership could not be determined. */
  unowned: string[];
}

/** Returns the first adapter that claims `path`, or undefined. */
export function adapterFor(path: string): ConfigurationAdapter | undefined {
  return adapters.find((adapter) => adapter.matches(path));
}

/**
 * Discovers all AI configuration artifacts under `rootPath`.
 *
 * A single file failing to parse must not fail the entire discovery
 * (Spec §34); such files are collected in `skipped` and analysis continues.
 */
export async function discover(rootPath: string): Promise<DiscoveryResult> {
  const files = await walkFiles(rootPath);
  return discoverFromFiles(files, rootPath);
}

/** Discover from an explicit list of files (used by integration tests). */
export async function discoverFromFiles(
  files: DiscoveredFile[],
  rootPath: string,
): Promise<DiscoveryResult> {
  const artifacts: ConfigurationArtifact[] = [];
  const skipped: string[] = [];
  const unowned: string[] = [];

  for (const file of files) {
    const adapter = adapterFor(file.relativePath);
    if (!adapter) {
      unowned.push(file.relativePath);
      continue;
    }

    try {
      const artifact = await adapter.parse(file.absolutePath, rootPath);
      artifacts.push(artifact);
    } catch (err: unknown) {
      skipped.push(file.relativePath);
      // eslint-disable-next-line no-console
      console.error(
        `[contextcheck] Could not parse configuration: ${file.relativePath}`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  return { artifacts, skipped, unowned };
}
