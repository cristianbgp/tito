import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import type { Auth } from "../auth";
import type { Config } from "../config";
import type { Database } from "../db";
import { parseAccountId } from "../dota/opendota";
import { errorSchema } from "../dota/schemas";
import { ReviewError } from "../review/contracts";
import {
  DraftError,
  draftCatalogSchema,
  draftInputSchema,
  draftResultSchema,
} from "./contracts";
import { heroCatalog, catalogRetrievedAt } from "./catalog";
import { DecisionsDraftModel, type DraftModel } from "./provider";
import { DraftService } from "./service";
import type { DraftEvidenceSource } from "./evidence";
const json = (schema: z.ZodType, description: string) => ({
  content: { "application/json": { schema } },
  description,
});
const errors = Object.fromEntries(
  [400, 401, 403, 409, 429, 502, 503, 504].map((code) => [
    code,
    json(errorSchema, "Hero suggestions unavailable"),
  ]),
) as Record<
  400 | 401 | 403 | 409 | 429 | 502 | 503 | 504,
  ReturnType<typeof json>
>;
export function registerDraftRoutes(
  app: OpenAPIHono,
  config: Config,
  auth: Auth,
  db?: Database,
  model?: DraftModel,
  evidence?: DraftEvidenceSource,
) {
  const enabled = Boolean(db && (model || config.openaiApiKey));
  const service = db
    ? new DraftService(
        db,
        model ??
          (config.openaiApiKey
            ? new DecisionsDraftModel(config.openaiApiKey)
            : null),
        config,
        Date.now,
        evidence,
      )
    : null;
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/tools/hero-picker",
      operationId: "getHeroDraftCatalog",
      responses: {
        200: json(
          draftCatalogSchema,
          "Bundled hero catalog and AI availability",
        ),
      },
    }),
    (c) => {
      c.header("Cache-Control", "public, max-age=60");
      return c.json(
        {
          heroes: heroCatalog,
          retrievedAt: catalogRetrievedAt,
          source: "bundled" as const,
          enabled,
        },
        200,
      );
    },
  );
  app.openapi(
    createRoute({
      method: "post",
      path: "/api/tools/hero-picker/suggest",
      operationId: "suggestDraftHeroes",
      request: {
        body: {
          required: true,
          content: { "application/json": { schema: draftInputSchema } },
        },
      },
      responses: {
        200: json(draftResultSchema, "Your draft hero suggestions"),
        ...errors,
      },
    }),
    async (c) => {
      c.header("Cache-Control", "private, no-store");
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session)
        return c.json({ error: "Sign in to request hero suggestions." }, 401);
      if (c.req.header("origin") !== config.webUrl)
        return c.json(
          { error: "Reload Tito and try suggesting heroes again." },
          403,
        );
      if (!service)
        return c.json(
          { error: "Hero suggestions are temporarily unavailable." },
          503,
        );
      try {
        return c.json(
          await service.suggest(
            session.user.id,
            session.user.steamId ? parseAccountId(session.user.steamId) : null,
            c.req.valid("json"),
          ),
          200,
        );
      } catch (error) {
        if (!(error instanceof DraftError || error instanceof ReviewError))
          throw error;
        if (error.retryAfter) c.header("Retry-After", String(error.retryAfter));
        return c.json({ error: error.message }, error.status);
      }
    },
  );
}
