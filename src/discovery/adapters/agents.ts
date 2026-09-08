/**
 * AGENTS adapter (Spec §14, §50).
 *
 * Owns `AGENTS.md` files — shared per-project agent instructions used by many
 * AI coding tools.
 */

import { readTextFile } from "../scanner.js";
import { buildArtifact } from "./artifact.js";
import type { ConfigurationAdapter } from "./types.js";

function isAgentsInstruction(path: string): boolean {
  return path === "AGENTS.md" || path.endsWith("/AGENTS.md");
}

export const agentsAdapter: ConfigurationAdapter = {
  name: "agents",
  matches: isAgentsInstruction,
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
