/**
 * End-to-end analyze runner (Spec §51).
 *
 * Wires the full local-first pipeline:
 *   discover -> assess git history -> run analyzer rules -> report
 *
 * No content ever leaves the machine (Spec §36). Git access is only for
 * metadata/sufficiency; it is skipped safely on any error (Spec §34).
 */

import { discover } from "../discovery/discover.js";
import {
  assessGitHistory,
  type GitSufficiencyResult,
} from "../git/sufficiency.js";
import { changedFilesInWindow } from "../git/history.js";
import type { AnalysisReport } from "../types/report.js";
import { analyze } from "./engine.js";
import { DEFAULT_ANALYSIS_OPTIONS, type AnalysisOptions } from "./types.js";

export interface RunAnalyzeOptions {
  rootPath: string;
  options?: Partial<AnalysisOptions>;
}

export interface RunAnalyzeResult {
  report: AnalysisReport;
  git: GitSufficiencyResult;
}

/**
 * Runs discovery + analysis for a repo root. Never throws on missing git;
 * when history is insufficient, scoped-rule findings are skipped (Rule 18).
 */
export async function runAnalyze(
  opts: RunAnalyzeOptions,
): Promise<RunAnalyzeResult> {
  const { rootPath } = opts;
  const options: AnalysisOptions = {
    ...DEFAULT_ANALYSIS_OPTIONS,
    ...opts.options,
  };

  const { artifacts } = await discover(rootPath);

  let git: GitSufficiencyResult;
  let changedFilePaths: string[] | undefined;

  try {
    git = await assessGitHistory(rootPath, options.gitWindowDays);
    if (git.sufficient && git.isGitRepo) {
      changedFilePaths = await changedFilesInWindow(
        rootPath,
        options.gitWindowDays,
      );
    } else {
      changedFilePaths = [];
    }
  } catch {
    // Never fail the whole analysis because git is unavailable (Spec §34).
    git = {
      isGitRepo: false,
      isShallow: false,
      windowCommitCount: 0,
      totalCommitCount: 0,
      sufficient: false,
    };
    changedFilePaths = [];
  }

  const report = await analyze({
    artifacts,
    context: {
      rootPath,
      options,
      changedFilePaths,
      gitHistorySufficient: git.sufficient,
    },
  });

  return { report, git };
}
