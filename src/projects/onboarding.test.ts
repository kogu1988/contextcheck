import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runOnboarding } from "./onboarding.js";
import { isInteractive } from "./prompts.js";
import { loadRegistry } from "./registry.js";

function stubPrompt(answers: {
  menu?: number;
  open?: string[];
  confirm?: boolean;
}) {
  let openIdx = 0;
  return {
    menu: () => Promise.resolve(answers.menu ?? 0),
    open: () => {
      const val = answers.open?.[openIdx] ?? "";
      openIdx += 1;
      return Promise.resolve(val);
    },
    confirm: () => Promise.resolve(answers.confirm ?? true),
  };
}

/** Non-TTY streams: isInteractive() must report false (no prompts). */
const nonInteractiveIO = {
  input: { isTTY: false },
  output: { isTTY: false },
} as never;

/** TTY-like streams: isInteractive() reports true (prompts may run). */
const interactiveIO = {
  input: { isTTY: true },
  output: { isTTY: true },
} as never;

describe("onboarding", () => {
  let baseDir: string;

  beforeEach(async () => {
    baseDir = await mkdtemp(join(tmpdir(), "cc-onb-"));
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it("skip (menu 3) leaves the registry empty", async () => {
    const did = await runOnboarding({
      io: interactiveIO,
      env: {},
      baseDir,
      prompt: stubPrompt({ menu: 3 }),
    });
    expect(did).toBe(true);
    expect((await loadRegistry(baseDir)).projects).toEqual([]);
  });

  it("does not run when non-interactive (CI / no TTY)", async () => {
    expect(isInteractive(nonInteractiveIO, { CI: "true" })).toBe(false);
    const did = await runOnboarding({
      io: nonInteractiveIO,
      env: { CI: "true" },
      baseDir,
      prompt: stubPrompt({ menu: 0 }),
    });
    expect(did).toBe(false);
    expect((await loadRegistry(baseDir)).projects).toEqual([]);
  });

  it("does not re-run onboarding once projects exist", async () => {
    const { addProject, saveRegistry } = await import("./registry.js");
    const reg = await loadRegistry(baseDir);
    await addProject(reg, process.cwd(), "Existing", process.cwd());
    await saveRegistry(reg, baseDir);

    const did = await runOnboarding({
      io: interactiveIO,
      env: {},
      baseDir,
      prompt: stubPrompt({ menu: 0 }),
    });
    expect(did).toBe(false);
    expect((await loadRegistry(baseDir)).projects).toHaveLength(1);
  });
});
