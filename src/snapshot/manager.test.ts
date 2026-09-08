import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  buildSnapshot,
  latestSnapshotFile,
  listSnapshotFiles,
  listSnapshots,
  loadSnapshotFile,
  resolveSnapshotRef,
  saveSnapshot,
  SNAPSHOT_VERSION,
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

  it("returns the latest snapshot by timestamp, not filename hash", async () => {
    // Older snapshot with a LARGER hash prefix (sorts later alphanumerically), and
    // a newer snapshot with a SMALLER hash prefix. Sorting by full filename would
    // pick the OLD one; sorting by the embedded timestamp must pick the NEW one.
    const oldSnap = buildSnapshot([
      makeArtifact({ path: "a.md", content: "1" }),
    ]);
    const newSnap = buildSnapshot([
      makeArtifact({ path: "b.md", content: "2" }),
    ]);
    oldSnap.id = "snap_zzzzz_2026-09-08T20-00-00-000Z";
    newSnap.id = "snap_aaaaa_2026-09-08T21-00-00-000Z";
    // saveSnapshot derives the path from snapshot.id (which we crafted).
    await saveSnapshot(root, oldSnap);
    await saveSnapshot(root, newSnap);

    // Sanity: full-filename sort would put old (z...) after new (a...).
    const sorted = [oldSnap.id, newSnap.id].sort();
    expect(sorted[sorted.length - 1]).toBe(oldSnap.id);

    const latest = await latestSnapshotFile(root);
    expect(latest).not.toBeNull();
    expect(latest).toContain(`${newSnap.id}.json`);
  });

  it("stores snapshots only under .contextcheck/snapshots", async () => {
    const snap = buildSnapshot([]);
    const file = await saveSnapshot(root, snap);
    const relative = join(".contextcheck", "snapshots");
    expect(file).toContain(relative);
  });

  it("tags snapshots with a schema version (v2 lock)", () => {
    const snap = buildSnapshot([]);
    expect(snap.version).toBe(SNAPSHOT_VERSION);
  });

  it("resolves a snapshot by its short id or unique prefix", async () => {
    const a = buildSnapshot([makeArtifact({ path: "a.md", content: "1" })]);
    a.id = "snap_abc12_2026-01-01T00-00-00-000Z";
    const b = buildSnapshot([makeArtifact({ path: "b.md", content: "2" })]);
    b.id = "snap_def34_2026-01-02T00-00-00-000Z";
    await saveSnapshot(root, a);
    await saveSnapshot(root, b);

    expect(await resolveSnapshotRef(root, "abc12")).toContain("abc12");
    expect(await resolveSnapshotRef(root, "snap_abc12")).toContain("abc12");
    expect(await resolveSnapshotRef(root, "abc")).toContain("abc12"); // unique prefix
    expect(await resolveSnapshotRef(root, "nope")).toBeNull();
  });

  it("listSnapshots returns metadata newest first", async () => {
    const a = buildSnapshot([makeArtifact({ path: "a.md", content: "1" })]);
    a.id = "snap_aaa_2026-01-01T00-00-00-000Z";
    a.createdAt = "2026-01-01T00:00:00.000Z";
    const b = buildSnapshot([makeArtifact({ path: "b.md", content: "2" })]);
    b.id = "snap_bbb_2026-01-02T00-00-00-000Z";
    b.createdAt = "2026-01-02T00:00:00.000Z";
    await saveSnapshot(root, a);
    await saveSnapshot(root, b);

    const snaps = await listSnapshots(root);
    expect(snaps).toHaveLength(2);
    expect(snaps[0]!.id).toBe(b.id); // newest (later createdAt)
  });
});
