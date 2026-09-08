import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  buildSnapshot,
  latestSnapshotFile,
  listSnapshotFiles,
  loadSnapshotFile,
  saveSnapshot,
} from "./manager.js";
import { makeArtifact } from "../../test/helpers/artifact.js";

describe("snapshot manager", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "cc-snap-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("builds a snapshot without any content", () => {
    const a = makeArtifact({
      path: "CLAUDE.md",
      content: "secret body here",
      scope: { patterns: ["x"] },
    });
    const snap = buildSnapshot([a]);

    expect(snap.configurationFiles).toBe(1);
    expect(snap.artifacts[0]).toEqual({
      id: expect.any(String),
      type: "instruction",
      path: "CLAUDE.md",
      scope: { patterns: ["x"] },
      metadata: expect.any(Object),
    });
    expect("content" in (snap.artifacts[0] as Record<string, unknown>)).toBe(
      false,
    );
  });

  it("saves, lists and loads snapshots", async () => {
    const snap = buildSnapshot([
      makeArtifact({ path: "AGENTS.md", content: "x" }),
    ]);
    const file = await saveSnapshot(root, snap);

    expect(file).toContain(join(".contextcheck", "snapshots"));
    const files = await listSnapshotFiles(root);
    expect(files).toHaveLength(1);

    const loaded = await loadSnapshotFile(files[0]!);
    expect(loaded.id).toBe(snap.id);
    expect(loaded.artifacts).toHaveLength(1);
  });

  it("returns empty info when no snapshots exist", async () => {
    expect(await listSnapshotFiles(root)).toEqual([]);
    expect(await latestSnapshotFile(root)).toBeNull();
  });

  it("returns the latest snapshot by ordering", async () => {
    const s1 = buildSnapshot([makeArtifact({ path: "a.md", content: "1" })]);
    const s2 = buildSnapshot([makeArtifact({ path: "b.md", content: "2" })]);
    s2.createdAt = new Date(Date.now() + 5000).toISOString();
    await saveSnapshot(root, s1);
    await saveSnapshot(root, s2);

    const latest = await latestSnapshotFile(root);
    expect(latest).not.toBeNull();
    const loaded = await loadSnapshotFile(latest!);
    expect(loaded.id).toBe(s2.id);
  });

  it("stores snapshots only under .contextcheck/snapshots", async () => {
    const snap = buildSnapshot([]);
    const file = await saveSnapshot(root, snap);
    const relative = join(".contextcheck", "snapshots");
    expect(file).toContain(relative);
  });
});
