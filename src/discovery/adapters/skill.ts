/**
 * Skill adapter (Spec §14, §50).
 *
 * Owns any `SKILL.md` file. Skills can live at any depth (a skill is a
 * directory containing `SKILL.md`), so we match the basename anywhere in the
 * tree minus excluded directories.
 */

import { readTextFile } from "../scanner.js";
import { buildArtifact } from "./artifact.js";
import type { ConfigurationAdapter } from "./types.js";

function isSkillFile(path: string): boolean {
  return path === "SKILL.md" || path.endsWith("/SKILL.md");
}

export const skillAdapter: ConfigurationAdapter = {
  name: "skill",
  matches: isSkillFile,
  async parse(filePath, rootPath) {
    const content = await readTextFile(filePath);
    return buildArtifact({
      type: "skill",
      absolutePath: filePath,
      rootPath,
      content,
    });
  },
};
