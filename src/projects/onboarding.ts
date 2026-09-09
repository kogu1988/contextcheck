/**
 * First-run onboarding.
 *
 * Triggered only when: the command is bare `context-check` / `projects`, the
 * registry is empty, AND the environment is interactive. Never runs for
 * `analyze`, `snapshot`, `diff`, or any `--json`/`--compact` invocation, and
 * never in CI. After setup, `context-check` shows a status/help instead.
 *
 * The prompt functions are injectable so tests can stub them (no real readline
 * TTY needed); by default they use the built-in `node:readline/promises`.
 */

import { loadConfig } from "../config/load.js";
import { runAnalyze } from "../analyzer/run.js";
import { formatTokens } from "../output/terminal.js";
import { addProject, loadRegistry, saveRegistry } from "./registry.js";
import { findLikelyProjects } from "./detect.js";
import { normalizeProjectPath, pathExists } from "./paths.js";
import type { PromptIO } from "./prompts.js";
import { askConfirm, askMenu, askOpen, isInteractive } from "./prompts.js";

export interface OnboardingPrompt {
  menu(title: string, choices: readonly string[]): Promise<number>;
  open(question: string): Promise<string>;
  confirm(question: string): Promise<boolean>;
}

export interface OnboardingOptions {
  baseDir?: string;
  io?: PromptIO;
  /** Override environment for interactivity checks (tests / CI). */
  env?: Record<string, string | undefined>;
  /** Inject a prompt runner (tests). Defaults to readline prompts. */
  prompt?: OnboardingPrompt;
}

const INTRO = `ContextCheck

Analyze and track the AI coding context in your projects.

No account required. No cloud required. No repository changes required.

Let's add your first project.`;

const MENU_CHOICES = [
  "Add a project",
  "Add a projects folder",
  "Add multiple projects",
  "Skip",
] as const;

const defaultPrompt: OnboardingPrompt = {
  menu: (title, choices) => askMenu(title, choices),
  open: (q) => askOpen(q),
  confirm: (q) => askConfirm(q),
};

/**
 * Runs onboarding. Returns true when the user got through setup (any project
 * added or explicitly skipped); false when it should not run.
 */
export async function runOnboarding(
  opts: OnboardingOptions = {},
): Promise<boolean> {
  // Never prompt in a non-interactive / CI environment.
  if (!isInteractive(opts.io, opts.env)) return false;

  // Once a registry exists, onboarding is done ("re-running" is handled by the
  // CLI showing status instead).
  const reg = await loadRegistry(opts.baseDir);
  if (reg.projects.length > 0) return false;

  const io = opts.io;
  const p: OnboardingPrompt = opts.prompt ?? defaultPrompt;

  const choice = await p.menu(INTRO, MENU_CHOICES);
  switch (choice) {
    case 0:
      await addSingle(p, opts.baseDir);
      return true;
    case 1:
      await addFolder(p, io, opts.baseDir);
      return true;
    case 2:
      await addMultiple(p, io, opts.baseDir);
      return true;
    default:
      return true; // Skip
  }
}

async function addSingle(p: OnboardingPrompt, baseDir?: string): Promise<void> {
  const raw = await p.open("Project path:\n> ");
  const normalized = safeNormalize(raw);
  if (!normalized || !pathExists(normalized)) {
    process.stdout.write("Path not found or invalid.\n");
    return;
  }
  await addAndConfirm(normalized, baseDir);
}

async function addFolder(
  p: OnboardingPrompt,
  io: PromptIO | undefined,
  baseDir?: string,
): Promise<void> {
  const raw = await p.open("Projects folder path:\n> ");
  const parent = safeNormalize(raw);
  if (!parent || !pathExists(parent)) {
    process.stdout.write("Path not found or invalid.\n");
    return;
  }
  const candidates = await findLikelyProjects(parent);
  if (candidates.length === 0) {
    process.stdout.write("No likely projects found.\n");
    return;
  }
  for (const c of candidates)
    process.stdout.write(`  [x] ${c.name}  (${c.path})\n`);
  const ok = await p.confirm(`Add ${candidates.length} project(s)?`);
  if (!ok) {
    process.stdout.write("No projects added.\n");
    return;
  }
  const reg = await loadRegistry(baseDir);
  for (const c of candidates) await addProject(reg, c.path, c.name);
  await saveRegistry(reg, baseDir);
  process.stdout.write(`Added ${candidates.length} project(s).\n`);
  void io;
}

async function addMultiple(
  p: OnboardingPrompt,
  io: PromptIO | undefined,
  baseDir?: string,
): Promise<void> {
  process.stdout.write(
    "Enter project paths, one per line. Empty line to finish.\n",
  );
  const raw = await p.open("First project path (or Enter to cancel):\n> ");
  if (!raw.trim()) {
    process.stdout.write("No projects added.\n");
    return;
  }
  const reg = await loadRegistry(baseDir);
  const paths = [raw];
  let next: string;
  do {
    next = await p.open("Next project path (Enter to finish):\n> ");
    if (next.trim()) paths.push(next);
  } while (next.trim());

  for (const path of paths) {
    const n = safeNormalize(path);
    if (!n || !pathExists(n)) {
      process.stdout.write(`Skipped (path not found): ${path}\n`);
      continue;
    }
    const res = await addProject(reg, n);
    process.stdout.write(res.added ? `Added: ${n}\n` : `Already added: ${n}\n`);
  }
  await saveRegistry(reg, baseDir);
  void io;
}

async function addAndConfirm(path: string, baseDir?: string): Promise<void> {
  const reg = await loadRegistry(baseDir);
  const res = await addProject(reg, path);
  if (!res.added) {
    process.stdout.write("Project already added.\n");
    return;
  }
  await saveRegistry(reg, baseDir);
  process.stdout.write(
    `\nProject added\n\n${res.entry?.name}\n${res.entry?.path}\n`,
  );

  // Run an initial analysis for a quick, useful first result.
  try {
    const options = await loadConfig(path);
    const { report } = await runAnalyze({ rootPath: path, options });
    process.stdout.write(
      `\n${report.summary.configurationFiles} AI configuration file(s)\n` +
        `~${formatTokens(report.summary.estimatedTokens)} estimated tokens\n` +
        `${report.findings.length} finding(s)\n`,
    );
  } catch {
    process.stdout.write(
      "\n(Initial analysis could not be run on this project.)\n",
    );
  }

  process.stdout.write(
    "\nYou're ready.\n\nRun:\n\n  context-check analyze\n\nto analyze the current project.\n",
  );
}

function safeNormalize(raw: string): string | null {
  if (!raw || !raw.trim()) return null;
  try {
    return normalizeProjectPath(raw);
  } catch {
    return null;
  }
}
