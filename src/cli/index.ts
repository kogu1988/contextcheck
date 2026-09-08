#!/usr/bin/env node
/**
 * contextcheck CLI entry point.
 *
 * Wires the local-first pipeline to commands: analyze, snapshot and diff are
 * functional; config remains a stub (handled by `.contextcheck.json`).
 */

import { Command } from "commander";

import { version } from "../index.js";
import { loadConfig } from "../config/load.js";
import { runAnalyze } from "../analyzer/run.js";
import { discover } from "../discovery/discover.js";
import { renderDiff, renderReport } from "../output/terminal.js";
import { serializeReport } from "../output/json.js";
import {
  isValidFailThreshold,
  shouldFailOnSeverity,
  type FailThreshold,
} from "../analyzer/severity.js";
import {
  buildSnapshot,
  latestSnapshotFile,
  loadSnapshotFile,
  saveSnapshot,
} from "../snapshot/manager.js";
import { diffBetweenSnapshots } from "../snapshot/diff.js";

/** Placeholder for not-yet-implemented commands. */
function placeholder(commandName: string): void {
  // eslint-disable-next-line no-console
  console.log(
    `[contextcheck] '${commandName}' command is not implemented yet.`,
  );
}

export async function analyzeAction(opts: {
  verbose?: boolean;
  json?: boolean;
  failOn?: string;
}): Promise<void> {
  const rootPath = process.cwd();
  const options = await loadConfig(rootPath);
  const { report } = await runAnalyze({ rootPath, options });

  if (opts.json) {
    // Privacy-safe DTO: raw configuration content is never serialized (Rule 23).
    process.stdout.write(`${serializeReport(report)}\n`);
  } else {
    process.stdout.write(`${renderReport(report, opts.verbose === true)}\n`);
  }

  // Exit-code policy: informational by default; only `--fail-on` fails CI.
  const failOn = normalizeFailThreshold(opts.failOn);
  if (failOn && shouldFailOnSeverity(report.findings, failOn)) {
    process.exitCode = 1;
  }
}

/** Parses `--fail-on` into a validated threshold, or undefined when absent. */
function normalizeFailThreshold(
  value: string | undefined,
): FailThreshold | undefined {
  if (!value) return undefined;
  if (isValidFailThreshold(value)) return value;
  // eslint-disable-next-line no-console
  console.error(
    `[contextcheck] Invalid --fail-on value "${value}". ` +
      `Use one of: info, notice, warning. Defaulting to informational.`,
  );
  return undefined;
}

/** `contextcheck snapshot` — records current AI configuration. */
export async function snapshotAction(): Promise<void> {
  const rootPath = process.cwd();
  const { artifacts } = await discover(rootPath);
  const snapshot = buildSnapshot(artifacts);
  const file = await saveSnapshot(rootPath, snapshot);
  // eslint-disable-next-line no-console
  console.log(
    `Snapshot saved: ${snapshot.id} (${snapshot.configurationFiles} files, ` +
      `~${snapshot.estimatedTokens} tokens)`,
  );
  void file;
}

/** `contextcheck diff` — compares latest snapshot vs current state. */
export async function diffAction(from?: string): Promise<void> {
  const rootPath = process.cwd();
  const { artifacts } = await discover(rootPath);
  const currentSnapshot = buildSnapshot(artifacts);

  let before;
  if (from) {
    const file = await loadSnapshotFile(from);
    before = file;
  } else {
    const latest = await latestSnapshotFile(rootPath);
    if (!latest) {
      // eslint-disable-next-line no-console
      console.log(
        "No snapshot to diff against. Run `contextcheck snapshot` first.",
      );
      return;
    }
    before = await loadSnapshotFile(latest);
  }

  const diff = diffBetweenSnapshots(before, currentSnapshot);
  process.stdout.write(`${renderDiff(diff)}\n`);
}

function buildProgram(): Command {
  const program = new Command();

  program
    .name("contextcheck")
    .description("AI coding configuration intelligence layer")
    .version(version);

  program
    .command("analyze")
    .description("Discover and analyze AI coding configuration files")
    .option("--verbose", "show detailed findings")
    .option("--json", "output machine-readable JSON")
    .option(
      "--fail-on <severity>",
      "fail with exit 1 on finding severity (info|notice|warning)",
    )
    .action(async (opts) => analyzeAction(opts));

  program
    .command("snapshot")
    .description("Create an AI configuration snapshot")
    .action(() => snapshotAction());

  program
    .command("diff")
    .description("Show AI configuration changes between snapshots")
    .argument("[from]", "snapshot file path to diff against (default: latest)")
    .action((from?: string) => diffAction(from));

  program
    .command("config")
    .description("View or modify contextcheck configuration")
    .action(() => placeholder("config"));

  return program;
}

export const program = buildProgram();

if (process.argv[1] && process.argv[1].endsWith("index.js")) {
  program.parse(process.argv);
}
