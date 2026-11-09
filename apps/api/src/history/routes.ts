import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import type { Auth } from "../auth";
import type { Config } from "../config";
import type { Database } from "../db";
import { parseAccountId, type OpenDota } from "../dota/opendota";
import { errorSchema } from "../dota/schemas";
import {
  historySchema,
  historyQuerySchema,
  historySyncSchema,
  HistoryError,
  progressSchema,
} from "./contracts";
import { HistoryService } from "./service";

const json = (schema: z.ZodType, description: string) => ({
  content: { "application/json": { schema } },
  description,
});
const errors = Object.fromEntries(
  [400, 401, 403, 409, 429, 502, 503, 504].map((code) => [
    code,
    json(errorSchema, "History unavailable"),
  ]),
) as Record<
  400 | 401 | 403 | 409 | 429 | 502 | 503 | 504,
  ReturnType<typeof json>
>;

export function registerHistoryRoutes(
  app: OpenAPIHono,
  config: Config,
  auth: Auth,
  dota: OpenDota,
  db?: Database,
) {
  const history = db
    ? new HistoryService(db, dota, {
        maxMatches: config.historyMaxMatches,
        cooldownSeconds: config.historyCooldownSeconds,
      })
    : null;
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/history/progress",
      operationId: "getPlayerProgress",
      responses: {
        200: json(progressSchema, "Your retained match progress"),
        ...errors,
      },
    }),
    async (c) => {
      c.header("Cache-Control", "private, no-store");
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session)
        return c.json({ error: "Sign in to view your progress." }, 401);
      if (!session.user.steamId)
        return c.json(
          { error: "Connect Steam to view your own progress." },
          403,
        );
      if (!history)
        return c.json(
          { error: "History storage is temporarily unavailable." },
          503,
        );
      return c.json(
        await history.progress(
          session.user.id,
          parseAccountId(session.user.steamId),
        ),
        200,
      );
    },
  );
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/history",
      operationId: "getSavedHistory",
      request: { query: historyQuerySchema },
      responses: {
        200: json(historySchema, "Your imported match summaries"),
        ...errors,
      },
    }),
    async (c) => {
      c.header("Cache-Control", "private, no-store");
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session)
        return c.json({ error: "Sign in to view saved history." }, 401);
      if (!session.user.steamId)
        return c.json(
          { error: "Connect Steam to save your own match history." },
          403,
        );
      if (!history)
        return c.json(
          { error: "History storage is temporarily unavailable." },
          503,
        );
      return c.json(
        await history.read(
          session.user.id,
          parseAccountId(session.user.steamId),
          c.req.valid("query").limit,
        ),
        200,
      );
    },
  );
  app.openapi(
    createRoute({
      method: "post",
      path: "/api/history/sync",
      operationId: "syncSavedHistory",
      request: {
        body: {
          required: true,
          content: { "application/json": { schema: historySyncSchema } },
        },
      },
      responses: {
        200: json(historySchema, "Imported bounded match summaries"),
        ...errors,
      },
    }),
    async (c) => {
      c.header("Cache-Control", "private, no-store");
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session)
        return c.json({ error: "Sign in to sync match history." }, 401);
      if (c.req.header("origin") !== config.webUrl)
        return c.json({ error: "Reload Tito and try syncing again." }, 403);
      if (!session.user.steamId)
        return c.json(
          { error: "Connect Steam to save your own match history." },
          403,
        );
      if (!history)
        return c.json(
          { error: "History storage is temporarily unavailable." },
          503,
        );
      try {
        return c.json(
          await history.sync(
            session.user.id,
            parseAccountId(session.user.steamId),
            c.req.valid("json").mode,
          ),
          200,
        );
      } catch (error) {
        if (!(error instanceof HistoryError)) throw error;
        if (error.retryAfter) c.header("Retry-After", String(error.retryAfter));
        return c.json({ error: error.message }, error.status);
      }
    },
  );
}
