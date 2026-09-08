/**
 * Cursor adapter (Spec §14, §50).
 *
 * Owns two Cursor formats:
 * - `.cursorrules` (root-level plain text rule file)
 * - `.cursor/rules/**` (rule files, typically `.mdc` or `.md`)
 *
 * Both are classified as `rule`.
 */

import { readTextFile } from "../scanner.js";
import { buildArtifact } from "./artifact.js";
import type { ConfigurationAdapter } from "./types.js";

function isCursorRule(path: string): boolean {
  if (path === ".cursorrules") return true;
  if (path.startsWith(".cursor/rules/")) return true;
  return false;
}

export const cursorAdapter: ConfigurationAdapter = {
  name: "cursor",
  matches: isCursorRule,
  async parse(filePath, rootPath) {
    const content = await readTextFile(filePath);
    return buildArtifact({
      type: "rule",
      absolutePath: filePath,
      rootPath,
      content,
    });
  },
};
