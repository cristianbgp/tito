import { requestLocale } from "../i18n/locale";
import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import type { Auth } from "../auth";
import type { Config } from "../config";
import type { Database } from "../db";
import { parseAccountId, type OpenDota } from "../dota/opendota";
import { errorSchema } from "../dota/schemas";
import { ReviewError, reviewStateSchema } from "./contracts";
import { OpenAIReviewModel, type ReviewModel } from "./provider";
import { ReviewService } from "./service";

const json = (schema: z.ZodType, description: string) => ({
  content: { "application/json": { schema } },
  description,
});
const errors = Object.fromEntries(
  [400, 401, 403, 409, 429, 502, 503, 504].map((code) => [
    code,
    json(errorSchema, "Review unavailable"),
  ]),
) as Record<
  400 | 401 | 403 | 409 | 429 | 502 | 503 | 504,
  ReturnType<typeof json>
>;
const params = z.object({ matchId: z.string().regex(/^[1-9]\d{0,15}$/) });
export function registerReviewRoutes(
  app: OpenAPIHono,
  config: Config,
  auth: Auth,
  source: OpenDota,
  db?: Database,
  model?: ReviewModel,
) {
  const service = db
    ? new ReviewService(
        db,
        source,
        model ??
          (config.openaiApiKey
            ? new OpenAIReviewModel(config.openaiApiKey)
            : null),
        config,
      )
    : null;
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/matches/{matchId}/review",
      operationId: "getMatchReview",
      request: { params },
      responses: {
        200: json(reviewStateSchema, "Your saved AI match review"),
        ...errors,
      },
    }),
    async (c) => {
      c.header("Cache-Control", "private, no-store");
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session)
        return c.json({ error: "Sign in to view your match review." }, 401);
      if (!session.user.steamId)
        return c.json(
          { error: "Connect Steam to review your own matches." },
          403,
        );
      if (!service)
        return c.json(
          { error: "Review storage is temporarily unavailable." },
          503,
        );
      return c.json(
        await service.read(
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
      path: "/api/matches/{matchId}/review",
      operationId: "generateMatchReview",
      request: {
        params,
        body: {
          required: true,
          content: { "application/json": { schema: z.object({}).strict() } },
        },
      },
      responses: {
        200: json(
          reviewStateSchema,
          "Your generated or unchanged saved review",
        ),
        ...errors,
      },
    }),
    async (c) => {
      c.header("Cache-Control", "private, no-store");
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session)
        return c.json({ error: "Sign in to generate your match review." }, 401);
      if (c.req.header("origin") !== config.webUrl)
        return c.json({ error: "Reload Tito and try generating again." }, 403);
      if (!session.user.steamId)
        return c.json(
          { error: "Connect Steam to review your own matches." },
          403,
        );
      if (!service)
        return c.json(
          { error: "Review storage is temporarily unavailable." },
          503,
        );
      try {
        return c.json(
          await service.generate(
            session.user.id,
            parseAccountId(session.user.steamId),
            c.req.valid("param").matchId,
            requestLocale(c.req.header("accept-language")),
          ),
          200,
        );
      } catch (error) {
        if (!(error instanceof ReviewError)) throw error;
        if (error.retryAfter) c.header("Retry-After", String(error.retryAfter));
        return c.json({ error: error.message }, error.status);
      }
    },
  );
}
