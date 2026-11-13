import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import type { Auth } from "../auth";
import type { Config } from "../config";
import type { Database } from "../db";
import { DataError, type OpenDota } from "../dota/opendota";
import { errorSchema } from "../dota/schemas";
import {
  heroEvidenceSchema,
  matchEvidenceSchema,
  patchReferenceSchema,
  patchChangesSchema,
} from "./contracts";
import { matchEvidence } from "./service";
import { readReplay } from "../replays/storage";
const json = (schema: z.ZodType, description: string) => ({
  content: { "application/json": { schema } },
  description,
});
const errors = {
  400: json(errorSchema, "Invalid identifier"),
  404: json(errorSchema, "Match not found"),
  429: json(errorSchema, "Request budget exhausted"),
  502: json(errorSchema, "Source unavailable"),
  504: json(errorSchema, "Source timeout"),
};

export function registerIntelligenceRoutes(
  app: OpenAPIHono,
  _config: Config,
  auth: Auth,
  dota: OpenDota,
  db?: Database,
) {
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/intelligence/heroes/{heroId}",
      operationId: "getHeroEvidence",
      request: {
        params: z.object({ heroId: z.string().regex(/^[1-9]\d{0,3}$/) }),
      },
      responses: {
        200: json(heroEvidenceSchema, "Source-attributed hero evidence"),
        ...errors,
      },
    }),
    async (c) => {
      c.header("Cache-Control", "public, max-age=60");
      return c.json(
        await dota.heroEvidence(Number(c.req.valid("param").heroId)),
        200,
      );
    },
  );
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/intelligence/matches/{id}",
      operationId: "getMatchEvidence",
      request: {
        params: z.object({ id: z.string().regex(/^[1-9]\d{0,15}$/) }),
      },
      responses: {
        200: json(matchEvidenceSchema, "Bounded recorded match observations"),
        ...errors,
      },
    }),
    async (c) => {
      // A completed parse invalidates the provider cache. Browsers must also
      // revalidate so a prior unparsed response cannot hide the new evidence.
      c.header("Cache-Control", "no-cache");
      try {
        const id = c.req.valid("param").id;
        const session = db
          ? await auth.api.getSession({ headers: c.req.raw.headers })
          : null;
        const replay =
          db && session ? await readReplay(db, session.user.id, id) : null;
        if (replay) c.header("Cache-Control", "private, no-store");
        return c.json(matchEvidence(replay ?? (await dota.match(id))), 200);
      } catch (error) {
        if (error instanceof DataError)
          return c.json({ error: error.message }, error.status);
        throw error;
      }
    },
  );
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/intelligence/patches",
      operationId: "getPatchReferences",
      responses: {
        200: json(patchReferenceSchema, "Dated official patch references"),
        ...errors,
      },
    }),
    async (c) => {
      c.header("Cache-Control", "public, max-age=300");
      return c.json(await dota.patchReferences(), 200);
    },
  );
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/intelligence/patches/{version}",
      operationId: "getPatchChanges",
      request: {
        params: z.object({
          version: z.string().regex(/^\d{1,2}\.\d{1,2}[a-z]?$/),
        }),
        query: z.object({
          heroIds: z
            .string()
            .regex(/^[1-9]\d{0,3}(,[1-9]\d{0,3}){0,9}$/)
            .optional(),
        }),
      },
      responses: {
        200: json(
          patchChangesSchema,
          "Official patch notes filtered to a hero pool",
        ),
        ...errors,
      },
    }),
    async (c) => {
      c.header("Cache-Control", "public, max-age=300");
      const { version } = c.req.valid("param");
      const heroes = c.req.valid("query").heroIds?.split(",").map(Number);
      return c.json(await dota.patchChanges(version, heroes), 200);
    },
  );
}
