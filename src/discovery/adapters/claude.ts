/**
 * Claude adapter (Spec §14, §50).
 *
 * Owns `CLAUDE.md` files. Claude instructions are markdown; the parsing of
 * markdown structure (headings, frontmatter) happens in the parser phase.
 */

import { readTextFile } from "../scanner.js";
import { buildArtifact } from "./artifact.js";
import type { ConfigurationAdapter } from "./types.js";

function isClaudeInstruction(path: string): boolean {
  return path === "CLAUDE.md" || path.endsWith("/CLAUDE.md");
}

export const claudeAdapter: ConfigurationAdapter = {
  name: "claude",
  matches: isClaudeInstruction,
  async parse(filePath, rootPath) {
    const content = await readTextFile(filePath);
    return buildArtifact({
      type: "instruction",
      absolutePath: filePath,
      rootPath,
      content,
    });
  },
};
