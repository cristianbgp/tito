import { defineConfig } from "orval";

export default defineConfig({
  tito: {
    input: "./apps/api/openapi.json",
    output: {
      target: "./apps/web/src/api/generated/tito.ts",
      schemas: "./apps/web/src/api/generated/models",
      client: "react-query",
      httpClient: "fetch",
      mode: "split",
      clean: true,
      override: {
        query: { version: 5 },
        fetch: { includeHttpResponseReturnType: false },
        mutator: { path: "./apps/web/src/api/transport.ts", name: "apiFetch" },
      },
    },
  },
});
