import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

import { REQUIRED_TEST_FILES } from "./coverage-map.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

describe("Spec §58 required test coverage", () => {
  it("all required analyzer test files exist", () => {
    for (const file of REQUIRED_TEST_FILES) {
      expect(existsSync(join(root, file)), file).toBe(true);
    }
  });

  it("every rule module has a sibling test file", () => {
    const dir = join(root, "src", "analyzer", "rules");
    const modules = readdirSync(dir).filter(
      (f) => f.endsWith(".ts") && !f.endsWith(".test.ts"),
    );
    for (const m of modules) {
      const testName = m.replace(/\.ts$/, ".test.ts");
      expect(existsSync(join(dir, testName)), `${m} -> ${testName}`).toBe(true);
    }
  });
});
