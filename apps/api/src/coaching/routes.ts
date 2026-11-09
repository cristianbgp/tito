import { requestLocale } from "../i18n/locale";
import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import type { Auth } from "../auth";
import type { Config } from "../config";
import type { Database } from "../db";
import { parseAccountId, type OpenDota } from "../dota/opendota";
import { errorSchema } from "../dota/schemas";
import { ReviewError } from "../review/contracts";
import {
  CoachingError,
  coachingStateSchema,
  followUpInputSchema,
  followUpStateSchema,
} from "./contracts";
import { OpenAICoachingModel, type CoachingModel } from "./provider";
import { CoachingService } from "./service";
const json = (schema: z.ZodType, description: string) => ({
  content: { "application/json": { schema } },
  description,
});
const errors = Object.fromEntries(
  [400, 401, 403, 409, 429, 502, 503, 504].map((code) => [
    code,
    json(errorSchema, "Coaching unavailable"),
  ]),
) as Record<
  400 | 401 | 403 | 409 | 429 | 502 | 503 | 504,
  ReturnType<typeof json>
>;
const params = z.object({ matchId: z.string().regex(/^[1-9]\d{0,15}$/) });
export function registerCoachingRoutes(
  app: OpenAPIHono,
  config: Config,
  auth: Auth,
  _source: OpenDota,
  db?: Database,
  model?: CoachingModel,
) {
  const service = db
    ? new CoachingService(
        db,
        model ??
          (config.openaiApiKey
            ? new OpenAICoachingModel(config.openaiApiKey)
            : null),
        config,
      )
    : null;
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/me/coaching",
      operationId: "getCoaching",
      responses: {
        200: json(
          coachingStateSchema,
          "Your saved coaching and deterministic observations",
        ),
        ...errors,
      },
    }),
    async (c) => {
      c.header("Cache-Control", "private, no-store");
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session)
        return c.json({ error: "Sign in to view your coaching." }, 401);
      if (!service)
        return c.json(
          { error: "Coaching storage is temporarily unavailable." },
          503,
        );
      return c.json(
        await service.read(
          session.user.id,
          session.user.steamId ? parseAccountId(session.user.steamId) : null,
        ),
        200,
      );
    },
  );
  app.openapi(
    createRoute({
      method: "post",
      path: "/api/me/coaching/summary",
      operationId: "generateCoachingSummary",
      request: {
        body: {
          required: true,
          content: { "application/json": { schema: z.object({}).strict() } },
        },
      },
      responses: {
        200: json(
          coachingStateSchema,
          "Your generated or cached coaching summary",
        ),
        ...errors,
      },
    }),
    async (c) => {
      c.header("Cache-Control", "private, no-store");
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session)
        return c.json({ error: "Sign in to request coaching." }, 401);
      if (c.req.header("origin") !== config.webUrl)
        return c.json({ error: "Reload Tito and try again." }, 403);
      if (!session.user.steamId)
        return c.json(
          { error: "Connect Steam to summarize your own saved games." },
          403,
        );
      if (!service)
        return c.json(
          { error: "Coaching storage is temporarily unavailable." },
          503,
        );
      try {
        return c.json(
          await service.summarize(
            session.user.id,
            parseAccountId(session.user.steamId),
            requestLocale(c.req.header("accept-language")),
          ),
          200,
        );
      } catch (error) {
        if (!(error instanceof CoachingError || error instanceof ReviewError))
          throw error;
        if (error.retryAfter) c.header("Retry-After", String(error.retryAfter));
        return c.json({ error: error.message }, error.status);
      }
    },
  );
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/matches/{matchId}/follow-up",
      operationId: "getMatchFollowUp",
      request: { params },
      responses: {
        200: json(followUpStateSchema, "Your latest cached follow-up answer"),
        ...errors,
      },
    }),
    async (c) => {
      c.header("Cache-Control", "private, no-store");
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session)
        return c.json({ error: "Sign in to view your follow-up." }, 401);
      if (!session.user.steamId)
        return c.json(
          { error: "Connect Steam to view your own follow-up." },
          403,
        );
      if (!service)
        return c.json(
          { error: "Coaching storage is temporarily unavailable." },
          503,
        );
      return c.json(
        await service.readFollowUp(
          session.user.id,
          parseAccountId(session.user.steamId),
          c.req.valid("param").matchId,
        ),
        200,
      );
    },
  );
  app.openapi(
    createRoute({
      method: "post",
      path: "/api/matches/{matchId}/follow-up",
      operationId: "generateMatchFollowUp",
      request: {
        params,
        body: {
          required: true,
          content: { "application/json": { schema: followUpInputSchema } },
        },
      },
      responses: {
        200: json(
          followUpStateSchema,
          "Your generated or cached bounded answer",
        ),
        ...errors,
      },
    }),
    async (c) => {
      c.header("Cache-Control", "private, no-store");
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session)
        return c.json({ error: "Sign in to ask a follow-up." }, 401);
      if (c.req.header("origin") !== config.webUrl)
        return c.json({ error: "Reload Tito and try again." }, 403);
      if (!session.user.steamId)
        return c.json(
          { error: "Connect Steam to ask about your own saved review." },
          403,
        );
      if (!service)
        return c.json(
          { error: "Coaching storage is temporarily unavailable." },
          503,
        );
      try {
        return c.json(
          await service.followUp(
            session.user.id,
            parseAccountId(session.user.steamId),
            c.req.valid("param").matchId,
            c.req.valid("json"),
            requestLocale(c.req.header("accept-language")),
          ),
          200,
        );
      } catch (error) {
        if (!(error instanceof CoachingError || error instanceof ReviewError))
          throw error;
        if (error.retryAfter) c.header("Retry-After", String(error.retryAfter));
        return c.json({ error: error.message }, error.status);
      }
    },
  );
}
