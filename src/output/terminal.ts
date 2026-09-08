/**
 * Terminal renderer (Spec §9, §28).
 *
 * Human-readable, non-fake-precision output (Spec §4.5). Findings are grouped
 * and summarized; `verbose` expands each finding with explanation. Command
 * output must never say "wasted tokens", "unused" or imply causal impact.
 */

import type { AnalysisReport } from "../types/report.js";
import type { Finding } from "../types/finding.js";
import type { SnapshotDiff } from "../snapshot/diff.js";

/** Wraps the normative label in brackets, e.g. INFO -> [INFO]. */
function label(finding: Finding): string {
  return `[${finding.label}]`;
}

/** Formats a full report for the terminal. */
export function renderReport(report: AnalysisReport, verbose = false): string {
  const lines: string[] = [];
  lines.push("contextcheck");
  lines.push("");
  lines.push("AI CONFIGURATION REPORT");
  lines.push("");

  const s = report.summary;
  lines.push(`Configuration files       ${s.configurationFiles}`);
  lines.push(`Skills                    ${s.skills}`);
  lines.push(`Estimated context     ${formatTokens(s.estimatedTokens)} tokens`);
  lines.push("");
  lines.push("Potential Context Overhead");
  lines.push(`~${formatTokens(s.potentialContextOverhead)} tokens`);
  lines.push("");

  lines.push("FINDINGS");

  if (report.findings.length === 0) {
    lines.push("");
    lines.push("No findings to report.");
  } else {
    for (const finding of report.findings) {
      lines.push("");
      lines.push(`${label(finding)} ${finding.title}`);
      if (verbose) {
        lines.push(finding.description);
        if (finding.recommendation) lines.push(finding.recommendation);
      }
    }
  }

  lines.push("");
  if (!verbose) {
    lines.push("Run `contextcheck analyze --verbose` for details.");
  }

  return lines.join("\n");
}

/** Formats a token count with thousands separators, e.g. 14820 -> "14,820". */
export function formatTokens(tokens: number): string {
  return Math.round(tokens).toLocaleString("en-US");
}

/**
 * Compact human renderer — answers "how many, how big, what needs attention"
 * at a glance. Pure presentation: it renders the same `AnalysisReport` the
 * terminal renderer uses, adding no analysis behavior.
 */
export function renderCompactReport(report: AnalysisReport): string {
  const s = report.summary;
  const lines: string[] = [];
  lines.push("ContextCheck");
  lines.push("");
  lines.push(`${s.configurationFiles} configuration files`);
  lines.push(`~${formatTokens(s.estimatedTokens)} estimated tokens`);
  lines.push("");
  lines.push(
    `${report.findings.length} ${plural(report.findings.length, "finding")}`,
  );

  if (report.findings.length > 0) {
    lines.push("");
    for (const finding of report.findings) {
      lines.push(`${label(finding)} ${finding.title}`);
      for (const path of finding.filePaths) {
        lines.push(`  ${path}`);
      }
      const detail = compactDetail(finding);
      if (detail) lines.push(`  ${detail}`);
    }
  } else {
    lines.push("");
    lines.push("No findings to report.");
  }

  lines.push("");
  lines.push(
    `Summary: ${s.configurationFiles} files · ${formatTokens(s.estimatedTokens)} tokens · ` +
      `${report.findings.length} ${plural(report.findings.length, "finding")}`,
  );

  return lines.join("\n");
}

/** Simple singula/plural helper for output. */
function plural(n: number, word: string): string {
  return n === 1 ? word : `${word}s`;
}

/** Short one-line detail per finding for compact output. */
function compactDetail(finding: Finding): string {
  switch (finding.type) {
    case "large-file": {
      const m = finding.description.match(/~([\d,]+) tokens/);
      return m ? `~${m[1]} tokens` : "large";
    }
    case "scoped-no-match":
      return "no matching file changes in Git history window";
    case "high-stakes":
      return "review manually before modifying or removing";
    case "duplicate":
      return "identical content across files";
    case "repetition":
      return "section repeated across files";
    case "context-overhead":
      return "potential redundant context";
    default:
      return "";
  }
}

/** Renders a snapshot diff in the Spec §30 format. */
export function renderDiff(diff: SnapshotDiff): string {
  const lines: string[] = [];
  lines.push("contextcheck CONFIG DIFF");
  lines.push("");

  for (const file of diff.files) {
    if (file.status === "unchanged") continue;

    lines.push(file.path);
    if (file.status === "added") {
      lines.push(`  + new rule (${formatTokens(file.afterTokens)} tokens)`);
    } else if (file.status === "removed") {
      lines.push(`  - removed (${formatTokens(file.beforeTokens)} tokens)`);
    } else {
      const sign = file.delta >= 0 ? "+" : "-";
      lines.push(`  ${sign} ${formatTokens(Math.abs(file.delta))} tokens`);
    }
  }

  lines.push("");
  lines.push("Estimated context:");
  lines.push(`  Previous     ~${formatTokens(diff.beforeTokens)}`);
  lines.push(`  Current      ~${formatTokens(diff.afterTokens)}`);
  const sign = diff.delta >= 0 ? "+" : "-";
  lines.push(
    `  Difference   ${sign}${formatTokens(Math.abs(diff.delta))} tokens`,
  );

  return lines.join("\n");
}
