/**
 * `.contextcheck.json` config loading (Spec §52).
 *
 * Optional. Defaults must work without a config file. Only supported
 * `analysis` keys are honored; unknown keys are ignored so an older/newer
 * config never breaks the CLI.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  DEFAULT_ANALYSIS_OPTIONS,
  type AnalysisOptions,
} from "../analyzer/types.js";

export const CONFIG_FILENAME = ".contextcheck.json";

interface RawConfig {
  analysis?: {
    largeFileTokens?: number;
    warningFileTokens?: number;
    gitWindowDays?: number;
  };
}

/** Reads and merges `.contextcheck.json` from a repo root. Never throws. */
export async function loadConfig(rootPath: string): Promise<AnalysisOptions> {
  const result: AnalysisOptions = { ...DEFAULT_ANALYSIS_OPTIONS };

  let raw: RawConfig | undefined;
  try {
    const text = await readFile(join(rootPath, CONFIG_FILENAME), "utf8");
    raw = JSON.parse(text) as RawConfig;
  } catch {
    // Missing or malformed config -> use defaults (Spec §52).
    return result;
  }

  const a = raw?.analysis;
  if (a && typeof a === "object") {
    if (isPositiveNumber(a.largeFileTokens))
      result.largeFileTokens = a.largeFileTokens;
    if (isPositiveNumber(a.warningFileTokens))
      result.warningFileTokens = a.warningFileTokens;
    if (isPositiveNumber(a.gitWindowDays))
      result.gitWindowDays = a.gitWindowDays;
  }

  return result;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
