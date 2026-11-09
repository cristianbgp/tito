import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { secureHeaders } from "hono/secure-headers";
import { bodyLimit } from "hono/body-limit";
import type { Auth } from "./auth";
import { isLocalUrl, type Config } from "./config";
import { listLocalEmails, localEmailSchema } from "./email";
import { DataError, OpenDota } from "./dota/opendota";
import type { Database } from "./db";
import { registerProfileRoutes } from "./profile/routes";
import { registerReplayRoutes } from "./dota/replay-routes";
import { registerHistoryRoutes } from "./history/routes";
import { claimProviderRequest } from "./history/budget";
import { registerReviewRoutes } from "./review/routes";
import type { ReviewModel } from "./review/provider";
import type { DraftModel } from "./draft/provider";
import { registerDraftRoutes } from "./draft/routes";
import { registerLocalRoutes } from "./local/routes";
import { registerLibraryRoutes } from "./library/routes";
import { registerIntelligenceRoutes } from "./intelligence/routes";
import { registerCoachingRoutes } from "./coaching/routes";
import type { CoachingModel } from "./coaching/provider";
import {
  errorSchema,
  matchDetailSchema,
  recentMatchSchema,
} from "./dota/schemas";

const json = <T extends z.ZodType>(schema: T, description: string) => ({
  content: { "application/json": { schema } },
  description,
});
const errors = {
  400: json(errorSchema, "Invalid input"),
  404: json(errorSchema, "No data"),
  429: json(errorSchema, "Rate limited"),
  502: json(errorSchema, "Upstream unavailable"),
  504: json(errorSchema, "Upstream timeout"),
};

export function createApp(
  config: Config,
  auth: Auth,
  dota?: OpenDota,
  db?: Database,
  reviewModel?: ReviewModel,
  draftModel?: DraftModel,
  coachingModel?: CoachingModel,
) {
  dota ??= new OpenDota(
    config.openDotaApiKey,
    fetch,
    Date.now,
    db
      ? () => claimProviderRequest(db, config.openDotaDailyRequestLimit)
      : undefined,
  );
  const app = new OpenAPIHono({
    defaultHook: (result, c) => {
      if (!result.success)
        return c.json(
          { error: "Check the supplied values and try again." },
          400,
        );
    },
  });
  app.use("*", secureHeaders());
  app.use(
    "/api/*",
    bodyLimit({
      maxSize: 32_768,
      onError: (c) => c.json({ error: "Request too large." }, 413),
    }),
  );
  app.onError((error, c) => {
    if (error instanceof DataError) {
      if (error.retryAfter) c.header("Retry-After", String(error.retryAfter));
      return c.json({ error: error.message }, error.status);
    }
    // Do not log request URLs: authentication callbacks can contain single-use tokens.
    console.error("Tito API request failed", error.name);
    return c.json({ error: "Something went wrong. Please try again." }, 500);
  });
  app.notFound((c) => c.json({ error: "Not found." }, 404));

  app.openapi(
    createRoute({
      method: "get",
      path: "/api/health",
      operationId: "getHealth",
      responses: {
        200: json(z.object({ status: z.literal("ok") }), "API readiness"),
      },
    }),
    (c) => c.json({ status: "ok" as const }, 200),
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/api/config",
      operationId: "getAppConfig",
      responses: {
        200: json(
          z
            .object({
              steamEnabled: z.boolean(),
              localInboxEnabled: z.boolean(),
              emailTransport: z.enum(["disabled", "local", "resend"]),
            })
            .openapi("AppConfig"),
          "Public capabilities",
        ),
      },
    }),
    (c) =>
      c.json(
        {
          steamEnabled: Boolean(config.steamApiKey),
          localInboxEnabled:
            !config.production && config.emailTransport === "local",
          emailTransport: config.emailTransport,
        },
        200,
      ),
  );

  app.on(["GET", "POST"], "/api/auth/*", async (c) => {
    if (!config.steamApiKey && c.req.path.startsWith("/api/auth/steam/"))
      return c.json(
        { error: "Steam sign-in is not available right now. Try again later." },
        503,
      );
    return auth.handler(c.req.raw);
  });

  app.openapi(
    createRoute({
      method: "get",
      path: "/api/players/{accountId}/matches",
      operationId: "getRecentMatches",
      request: {
        params: z.object({
          accountId: z
            .string()
            .regex(/^[1-9]\d{0,16}$/)
            .openapi({ example: "70388657" }),
        }),
      },
      responses: {
        200: json(z.array(recentMatchSchema), "Available recent matches"),
        ...errors,
      },
    }),
    async (c) =>
      c.json(await dota.recentMatches(c.req.valid("param").accountId), 200),
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/api/matches/{matchId}",
      operationId: "getMatch",
      request: {
        params: z.object({ matchId: z.string().regex(/^[1-9]\d{0,15}$/) }),
      },
      responses: {
        200: json(matchDetailSchema, "Available match details"),
        ...errors,
      },
    }),
    async (c) => c.json(await dota.match(c.req.valid("param").matchId), 200),
  );

  if (!config.production && config.emailTransport === "local") {
    app.openapi(
      createRoute({
        method: "get",
        path: "/api/dev/emails",
        operationId: "getLocalEmails",
        responses: {
          200: json(
            z.array(localEmailSchema).openapi("LocalEmails"),
            "Local development outbox",
          ),
          404: json(errorSchema, "Unavailable"),
        },
      }),
      async (c) => {
        if (!isLocalUrl(c.req.url)) return c.json({ error: "Not found." }, 404);
        c.header("Cache-Control", "no-store");
        return c.json(await listLocalEmails(config.dataDir), 200);
      },
    );
  }

  registerProfileRoutes(app, config, auth, db);
  registerHistoryRoutes(app, config, auth, dota, db);
  registerReplayRoutes(app, config, auth, dota);
  registerReviewRoutes(app, config, auth, dota, db, reviewModel);
  registerDraftRoutes(app, config, auth, db, draftModel, dota);
  registerLocalRoutes(app, config, auth);
  registerLibraryRoutes(app, config, auth, db);
  registerIntelligenceRoutes(app, config, auth, dota, db);
  registerCoachingRoutes(app, config, auth, dota, db, coachingModel);

  app.doc("/api/openapi.json", {
    openapi: "3.1.0",
    info: { title: "Tito API", version: "0.1.0" },
  });
  return app;
}
