import { readConfig } from "./config";
import { createDatabase } from "./db";
import { createAuth } from "./auth";
import { createApp } from "./app";

const config = readConfig(process.env);
// Development and production entry-point scripts apply migrations before launching this server.
const database = await createDatabase(config);
const auth = createAuth(config, database.db);
const app = createApp(config, auth, undefined, database.db);
const server = Bun.serve({
  hostname: config.production ? "0.0.0.0" : "127.0.0.1",
  port: config.port,
  fetch: app.fetch,
  maxRequestBodySize: 4 * 1024 * 1024,
});
console.log(
  `Tito API ready at ${process.env.PORTLESS_URL ?? `http://127.0.0.1:${server.port}`}`,
);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, async () => {
    await server.stop(true);
    await app.closeReplayImports();
    await database.close();
    process.exit(0);
  });
}
