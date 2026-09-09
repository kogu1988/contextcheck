/**
 * Interactive prompts for onboarding / project management.
 *
 * Uses the built-in `node:readline/promises` module — NO new dependency. In
 * non-interactive environments (CI, pipes, `--json`/`--compact`, no TTY) prompts
 * are never used; callers must check `isInteractive()` and provide a non-
 * interactive path so CI never hangs.
 */

import { createInterface, type Interface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

/** readline Interface with a writable output handle. */
type PromptInterface = Interface & {
  output: NodeJS.WritableStream & PromptStreamLike;
};

export interface PromptStreamLike {
  isTTY?: boolean;
  write?(chunk: unknown): boolean | void;
}

export interface PromptIO {
  input: NodeJS.ReadableStream & PromptStreamLike;
  output: NodeJS.WritableStream & PromptStreamLike;
}

/** Default IO = process stdin/stdout. */
const defaultIO: PromptIO = { input: stdin, output: stdout };

/** Whether interactive TTY prompting is possible (and CI is not detected). */
export function isInteractive(
  io: PromptIO = defaultIO,
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (!io.input.isTTY || !io.output.isTTY) return false;
  // CI / non-interactive automation signals -> never prompt.
  if (env["CI"] === "true") return false;
  if (env["NO_PROMPT"] === "1") return false;
  if (env["TERM"] === "dumb") return false;
  return true;
}

/** Creates a readline prompt on the given IO. */
export function createPrompt(io: PromptIO = defaultIO): PromptInterface {
  return createInterface({
    input: io.input,
    output: io.output,
  }) as PromptInterface;
}

/** Asks a single-line open question. */
export async function askOpen(
  question: string,
  io: PromptIO = defaultIO,
): Promise<string> {
  const rl = createPrompt(io);
  try {
    const answer = await rl.question(question);
    return answer.trim();
  } finally {
    rl.close();
  }
}

/**
 * Presents a numbered menu (0..n) and returns the selected index.
 * `choices` are labels; the returned index is 0-based. Empty input selects 0.
 */
export async function askMenu(
  title: string,
  choices: readonly string[],
  io: PromptIO = defaultIO,
): Promise<number> {
  const rl = createPrompt(io);
  try {
    rl.output.write(`${title}\n`);
    let display = "";
    choices.forEach((label, i) => {
      display += `${i === 0 ? "  >" : "   "} ${label}\n`;
    });
    display += "\nEnter a number (default 0): ";
    const answer = await rl.question(display);
    const n = parseInt(answer, 10);
    if (Number.isNaN(n)) return 0;
    return Math.min(Math.max(n, 0), choices.length - 1);
  } finally {
    rl.close();
  }
}

/** Presents a yes/no confirm. Default true when empty input. */
export async function askConfirm(
  question: string,
  io: PromptIO = defaultIO,
): Promise<boolean> {
  const rl = createPrompt(io);
  try {
    const answer = (await rl.question(`${question} [Y/n] `))
      .trim()
      .toLowerCase();
    return answer === "" || answer === "y" || answer === "yes";
  } finally {
    rl.close();
  }
}

/** Writes text to the prompt output (no readline buffer). */
export function write(io: PromptIO = defaultIO, text = ""): void {
  io.output.write(text);
}
