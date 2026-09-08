import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadConfig } from "./load.js";
import { DEFAULT_ANALYSIS_OPTIONS } from "../analyzer/types.js";

describe("loadConfig (Spec §52)", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "cc-config-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("returns defaults when no config file exists", async () => {
    const config = await loadConfig(root);
    expect(config).toEqual(DEFAULT_ANALYSIS_OPTIONS);
  });

  it("honors supported analysis keys", async () => {
    await writeFile(
      join(root, ".contextcheck.json"),
      JSON.stringify({
        analysis: { largeFileTokens: 5000, gitWindowDays: 30 },
      }),
    );
    const config = await loadConfig(root);
    expect(config.largeFileTokens).toBe(5000);
    expect(config.gitWindowDays).toBe(30);
    expect(config.warningFileTokens).toBe(
      DEFAULT_ANALYSIS_OPTIONS.warningFileTokens,
    );
  });

  it("falls back to defaults on malformed JSON", async () => {
    await writeFile(join(root, ".contextcheck.json"), "{ not json");
    expect(await loadConfig(root)).toEqual(DEFAULT_ANALYSIS_OPTIONS);
  });

  it("ignores invalid and unknown values", async () => {
    await writeFile(
      join(root, ".contextcheck.json"),
      JSON.stringify({ analysis: { largeFileTokens: -5, unknownThing: 99 } }),
    );
    const config = await loadConfig(root);
    expect(config.largeFileTokens).toBe(
      DEFAULT_ANALYSIS_OPTIONS.largeFileTokens,
    );
  });
});
