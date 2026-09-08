import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { defineConfig, type Plugin } from "vitest/config";

/**
 * Allows NodeNext-style `.js` import specifiers in TypeScript source to
 * resolve to their `.ts` source files at test time. Vite does not map
 * `.js` -> `.ts` by default, but the emitted ESM output relies on `.js`
 * extensions. Keep runtime output (Node ESM) and test resolution aligned.
 *
 * The rewrite is skipped for anything inside `node_modules` so Vitest/Vite
 * internals (which legitimately import `.js`-only files) are untouched.
 */
function tsExtensionResolve(): Plugin {
  return {
    name: "ts-extension-resolve",
    enforce: "pre",
    resolveId(source, importer) {
      if (!importer || !source.endsWith(".js")) return null;
      if (
        importer.includes("/node_modules/") ||
        importer.includes("\\node_modules\\")
      )
        return null;

      const asTs = resolve(dirname(importer), source.replace(/\.js$/, ".ts"));
      if (!existsSync(asTs)) return null;

      return asTs;
    },
  };
}

export default defineConfig({
  plugins: [tsExtensionResolve()],
  test: {
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    environment: "node",
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
