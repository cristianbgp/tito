import { createApp } from "../src/app";
import { readConfig } from "../src/config";
import type { Auth } from "../src/auth";

// Generating route contracts requires neither a database connection nor auth secrets.
const app = createApp(readConfig({}), {} as Auth);
await Bun.write(
  "./openapi.json",
  JSON.stringify(
    app.getOpenAPIDocument({
      openapi: "3.1.0",
      info: { title: "Tito API", version: "0.1.0" },
    }),
    null,
    2,
  ) + "\n",
);
