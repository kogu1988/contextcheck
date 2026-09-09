/**
 * Project-manager command actions.
 *
 * Keeps project management separate from analysis (spec separation): the
 * project manager decides WHICH directories to analyze; the discovery engine
 * decides which AI configuration files exist inside a directory. `analyze`
 * (current directory) is never changed.
 *
 * All commands are local-only: the registry never sends anything anywhere.
 */

import { loadConfig } from "../config/load.js";
import { runAnalyze } from "../analyzer/run.js";
import { formatTokens } from "../output/terminal.js";
import {
  addProject,
  find,
  loadRegistry,
  removeProject,
  saveRegistry,
  type ProjectEntry,
  type RegistryFile,
} from "./registry.js";
import { normalizeProjectPath, pathExists } from "./paths.js";
import { findLikelyProjects } from "./detect.js";
import { askConfirm, isInteractive } from "./prompts.js";

export interface ProjectActionOptions {
  /** Registry directory override (tests). */
  baseDir?: string;
  /** Prompt IO override (tests). */
  prompt?: { confirm: (q: string) => Promise<boolean> };
}

/** Renders the registry listing. */
export async function listProjects(
  opts: ProjectActionOptions = {},
): Promise<{ entries: ProjectEntry[]; output: string }> {
  const reg = await loadRegistry(opts.baseDir);
  const lines: string[] = ["ContextCheck Projects", ""];
  lines.push("NAME          PATH");
  for (const p of reg.projects) {
    lines.push(p.name.padEnd(14) + p.path);
  }
  lines.push("");
  lines.push(
    `${reg.projects.length} project${reg.projects.length === 1 ? "" : "s"}`,
  );
  return { entries: reg.projects, output: lines.join("\n") };
}

/** Adds one or more absolute paths to the registry. */
export async function addProjects(
  paths: string[],
  opts: ProjectActionOptions = {},
): Promise<{ output: string; added: string[]; skipped: string[] }> {
  const reg = await loadRegistry(opts.baseDir);
  const added: string[] = [];
  const skipped: string[] = [];

  for (const raw of paths) {
    if (!raw || raw.trim().length === 0) continue;
    let normalized: string;
    try {
      normalized = normalizeProjectPath(raw);
    } catch {
      skipped.push(raw);
      continue;
    }
    if (!pathExists(normalized)) {
      skipped.push(raw);
      continue;
    }
    const res = await addProject(reg, normalized);
    if (res.added) added.push(normalized);
    else skipped.push(normalized);
  }

  await saveRegistry(reg, opts.baseDir);

  const lines: string[] = [];
  for (const p of added) lines.push(`Added: ${p}`);
  for (const s of skipped)
    lines.push(
      `Skipped (${pathExists(s) ? "already added" : "path not found"}): ${s}`,
    );
  return { output: lines.join("\n") || "No projects changed.", added, skipped };
}

/** Removes projects from the registry (never touches the directory). */
export async function removeProjects(
  refs: string[],
  opts: ProjectActionOptions = {},
): Promise<{ output: string; removed: string[] }> {
  const reg = await loadRegistry(opts.baseDir);
  const removed: string[] = [];

  for (const ref of refs) {
    const entry = resolveRef(reg, ref);
    if (!entry) continue;
    // removeProject accepts id OR path; it never deletes the directory.
    removeProject(reg, entry.id, process.cwd());
    // Report the STORED display path (not the user-typed ref).
    removed.push(entry.path);
  }

  await saveRegistry(reg, opts.baseDir);
  const lines = removed.length
    ? removed.map((p) => `Removed from registry: ${p}`)
    : ["No projects matched."];
  return { output: lines.join("\n"), removed };
}

/**
 * Scans a parent directory (immediate children only) for likely projects and,
 * when interactive, confirms before adding. Never recurses, never adds junk.
 */
export async function scanProjects(
  parentPath: string,
  opts: ProjectActionOptions = {},
): Promise<{ output: string; candidates: string[]; added: string[] }> {
  const parent = normalizeProjectPath(parentPath);
  if (!pathExists(parent)) {
    return { output: `Path not found: ${parent}`, candidates: [], added: [] };
  }

  const candidates = await findLikelyProjects(parent);
  if (candidates.length === 0) {
    return {
      output: `No likely projects found in ${parent}.`,
      candidates: [],
      added: [],
    };
  }

  const paths = candidates.map((c) => c.path);

  // Confirmation before adding. In a real terminal (interactive) we prompt;
  // if no prompt function is wired (e.g. non-interactive, tests without
  // prompt), we do NOT auto-add — safe default, never bulk-add unseen dirs.
  let confirmed = false;
  if (opts.prompt?.confirm) {
    confirmed = await opts.prompt.confirm(
      `Found ${candidates.length} potential projects. Add all?`,
    );
  } else if (isInteractive()) {
    confirmed = await askConfirm(
      `Found ${candidates.length} potential projects. Add all?`,
    );
  }
  if (!confirmed) {
    return {
      output: `Found ${candidates.length} potential projects (not added — no confirmation received).`,
      candidates: paths,
      added: [],
    };
  }

  const res = await addProjects(
    candidates.map((c) => c.path),
    opts,
  );
  return {
    output: res.output,
    candidates: candidates.map((c) => c.path),
    added: res.added,
  };
}

/** Analyzes every registered project (analysis only; no snapshots created). */
export async function analyzeAllProjects(
  opts: ProjectActionOptions = {},
): Promise<{ output: string }> {
  const reg = await loadRegistry(opts.baseDir);
  if (reg.projects.length === 0) {
    return {
      output: "No projects registered. Run `context-check projects add`.",
    };
  }

  const lines: string[] = ["ContextCheck Projects"];
  for (const p of reg.projects) {
    const exists = pathExists(p.path);
    lines.push("");
    lines.push(p.name);
    lines.push(p.path);
    if (!exists) {
      lines.push("Status: path not found");
      continue;
    }
    try {
      const options = await loadConfig(p.path);
      const { report } = await runAnalyze({ rootPath: p.path, options });
      const files = report.summary.configurationFiles;
      const tokens = report.summary.estimatedTokens;
      lines.push(
        `${files} AI configuration file${files === 1 ? "" : "s"} · ` +
          `~${formatTokens(tokens)} tokens · ${report.findings.length} finding${report.findings.length === 1 ? "" : "s"}`,
      );
    } catch (err: unknown) {
      lines.push(
        `Status: analysis failed (${err instanceof Error ? err.message : String(err)})`,
      );
    }
  }
  return { output: lines.join("\n") };
}

/** Resolves a registry reference (id or path) to an entry. */
export function resolveRef(
  registry: RegistryFile,
  ref: string,
): ProjectEntry | undefined {
  const byId = registry.projects.find((p) => p.id === ref);
  if (byId) return byId;
  return find(registry, ref);
}
