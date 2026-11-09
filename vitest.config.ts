import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": new URL("./apps/web/src", import.meta.url).pathname },
  },
  test: {
    include: ["apps/**/*.test.{ts,tsx}"],
    fileParallelism: false,
    testTimeout: 30000,
  },
});
