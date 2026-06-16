import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@aide/core": fileURLToPath(
        new URL("./packages/core/src/index.ts", import.meta.url)
      ),
      "@aide/ai-command-interpreter": fileURLToPath(
        new URL("./packages/ai-command-interpreter/src/index.ts", import.meta.url)
      )
    }
  },
  test: {
    include: ["packages/**/*.test.ts", "packages/**/*.test.tsx"]
  }
});
