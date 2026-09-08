/**
 * Recursive discovery scanner (Spec §14, §15).
 *
 * Walks the repository root, skipping excluded directories at every level,
 * and yields the file paths that should be handed to adapters for parse.
 * This module only discovers — it never decides what a file *is*; that is the
 * adapter's job (Rule 14).
 */

import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";

import { isExcludedDirectory } from "./exclusions.js";

export interface DiscoveredFile {
  /** Absolute path on disk. */
  absolutePath: string;
  /** Path relative to the scanned root (posix-normalized). */
  relativePath: string;
}

/**
 * Recursively walks `rootPath` and returns every file path, skipping the
 * excluded directories defined in Spec §15.
 */
export async function walkFiles(rootPath: string): Promise<DiscoveredFile[]> {
  const results: DiscoveredFile[] = [];

  async function walk(dir: string): Promise<void> {
    // readdir withFileTypes avoids a stat call per entry and lets us skip
    // directories cheaply. ENOENT is tolerated to avoid races on deletion.
    let entries: import("node:fs").Dirent[];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return;
      throw err;
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        if (isExcludedDirectory(entry.name)) continue;
        await walk(fullPath);
        continue;
      }

      if (entry.isFile()) {
        results.push({
          absolutePath: fullPath,
          relativePath: normalizeRelative(rootPath, fullPath),
        });
      }
    }
  }

  await walk(rootPath);
  return results;
}

/** Normalizes a path to be relative to root with forward slashes. */
function normalizeRelative(rootPath: string, filePath: string): string {
  const rel = relative(rootPath, filePath);
  return rel.split(sep).join("/");
}

/** Reads a file's content as UTF-8. */
export async function readTextFile(absolutePath: string): Promise<string> {
  return readFile(absolutePath, "utf8");
}

/**
 * Counts lines in `content`. A trailing line terminator is treated as a line
 * boundary rather than an extra empty line, so `"a\nb\n"` is 2 lines.
 */
export function countLines(content: string): number {
  if (content.length === 0) return 0;
  const endsWithBreak = /\r\n|\r|\n$/.test(content);
  const raw = content.split(/\r\n|\r|\n/).length;
  return endsWithBreak ? raw - 1 : raw;
}

/** Returns basic file metadata (size + line count). */
export async function describeFile(absolutePath: string): Promise<{
  sizeBytes: number;
  lineCount: number;
}> {
  const s = await stat(absolutePath);
  const content = await readTextFile(absolutePath);
  return { sizeBytes: s.size, lineCount: countLines(content) };
}
