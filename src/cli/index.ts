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
import {
  formatTokens,
  renderCompactReport,
  renderDiff,
  renderReport,
} from "../output/terminal.js";
import { serializeDiff, serializeReport } from "../output/json.js";
import {
  isValidFailThreshold,
  shouldFailOnSeverity,
  type FailThreshold,
} from "../analyzer/severity.js";
import {
  buildSnapshot,
  latestSnapshotFile,
  listSnapshots,
  loadSnapshotFile,
  resolveSnapshotRef,
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
  compact?: boolean;
  failOn?: string;
}): Promise<void> {
  const rootPath = process.cwd();
  const options = await loadConfig(rootPath);
  const { report } = await runAnalyze({ rootPath, options });

  if (opts.json) {
    // Privacy-safe DTO: raw configuration content is never serialized (Rule 23).
    process.stdout.write(`${serializeReport(report)}\n`);
  } else if (opts.compact) {
    process.stdout.write(`${renderCompactReport(report)}\n`);
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

/** `contextcheck snapshot` — records current AI configuration + findings. */
export async function snapshotAction(): Promise<void> {
  const rootPath = process.cwd();
  const options = await loadConfig(rootPath);
  // Capture analysis findings so a snapshot reflects the full context state.
  const { report } = await runAnalyze({ rootPath, options });
  const snapshot = buildSnapshot(report.artifacts, report.findings);
  const file = await saveSnapshot(rootPath, snapshot);
  // eslint-disable-next-line no-console
  console.log(
    `Snapshot saved: ${snapshot.id} (${snapshot.configurationFiles} files, ` +
      `~${snapshot.estimatedTokens} tokens, ${report.findings.length} findings)`,
  );
  void file;
}

/** `contextcheck diff [snapshot-id]` — compares a snapshot vs current state. */
export async function diffAction(
  from?: string,
  opts: { json?: boolean } = {},
): Promise<void> {
  const rootPath = process.cwd();
  const options = await loadConfig(rootPath);
  const { report } = await runAnalyze({ rootPath, options });
  const currentSnapshot = buildSnapshot(report.artifacts, report.findings);

  let before: Awaited<ReturnType<typeof loadSnapshotFile>>;
  if (from) {
    const resolved = await resolveSnapshotRef(rootPath, from);
    if (!resolved) {
      // eslint-disable-next-line no-console
      console.error(`[contextcheck] No snapshot found for "${from}".`);
      process.exitCode = 1;
      return;
    }
    before = await loadSnapshotFile(resolved);
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
  if (opts.json) {
    process.stdout.write(`${serializeDiff(diff, before)}\n`);
    return;
  }
  process.stdout.write(`${renderDiff(diff)}\n`);
}

/** `contextcheck snapshot list` — lists stored snapshots. */
export async function snapshotListAction(): Promise<void> {
  const rootPath = process.cwd();
  const snaps = await listSnapshots(rootPath);
  if (snaps.length === 0) {
    // eslint-disable-next-line no-console
    console.log("No snapshots yet. Run `contextcheck snapshot` first.");
    return;
  }

  const short = (s: { id: string }) => s.id.split("_")[1] ?? s.id;
  const dateFmt = (iso: string) => iso.replace("T", " ").replace(/\..*/, "");

  const lines: string[] = [];
  lines.push("ContextCheck Snapshots");
  lines.push("");
  lines.push("ID        Created                 Files  Tokens  Findings");
  for (const s of snaps) {
    lines.push(
      `${short(s).padEnd(9)}${dateFmt(s.createdAt).padEnd(25)}${String(s.configurationFiles).padEnd(7)}` +
        `${formatTokens(s.estimatedTokens).padEnd(8)}${s.findings?.length ?? 0}`,
    );
  }
  // eslint-disable-next-line no-console
  console.log(lines.join("\n"));
}

function buildProgram(): Command {
  const program = new Command();

  program
    .name("context-check")
    .description("AI coding configuration intelligence layer")
    .version(version);

  program
    .command("analyze")
    .description("Discover and analyze AI coding configuration files")
    .option("--verbose", "show detailed findings")
    .option("--json", "output machine-readable JSON")
    .option("--compact", "compact human-readable output")
    .option(
      "--fail-on <severity>",
      "fail with exit 1 on finding severity (info|notice|warning)",
    )
    .action(async (opts) => analyzeAction(opts));

  const snapshotCommand = program
    .command("snapshot")
    .description("Create or inspect AI configuration snapshots");

  snapshotCommand
    .command("list")
    .description("List stored snapshots")
    .action(() => snapshotListAction());

  snapshotCommand.action(() => snapshotAction());

  program
    .command("diff")
    .description(
      "Show AI configuration changes between a snapshot and current state",
    )
    .argument("[from]", "snapshot id to diff against (default: latest)")
    .option("--json", "output privacy-safe JSON diff")
    .action((from: string | undefined, opts: { json?: boolean }) =>
      diffAction(from, opts),
    );

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
