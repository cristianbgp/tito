import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import type { Context } from "hono";
import type { Auth } from "../auth";
import type { Config } from "../config";
import type { Database } from "../db";
import { parseAccountId } from "../dota/opendota";
import { errorSchema } from "../dota/schemas";
import { LibraryService } from "./service";
import {
  draftSnapshotInputSchema,
  draftSnapshotSchema,
  draftUpdateSchema,
  feedbackInputSchema,
  feedbackSchema,
  heroDetailSchema,
  heroSummarySchema,
  LibraryError,
  matchIdSchema,
  noteInputSchema,
  noteSchema,
  poolInputSchema,
  poolSchema,
  reflectionQuerySchema,
  reflectionSchema,
  roleSchema,
  usageSchema,
} from "./contracts";
const json = <S extends z.ZodType>(schema: S, description: string) => ({
  content: { "application/json": { schema } },
  description,
});
const body = <S extends z.ZodType>(schema: S) => ({
  required: true,
  content: { "application/json": { schema } },
});
const errors = {
  400: json(errorSchema, "Invalid library input"),
  401: json(errorSchema, "Sign in required"),
  403: json(errorSchema, "Steam connection or trusted Origin required"),
  404: json(errorSchema, "Owned item unavailable"),
  409: json(errorSchema, "Library storage cap reached"),
  503: json(errorSchema, "Library storage unavailable"),
};
const matchParams = z.object({ matchId: matchIdSchema });
const draftParams = z.object({ id: z.string().uuid() });
const roleParams = z.object({ role: roleSchema });
const heroParams = z.object({ heroId: z.coerce.number().int().positive() });
const deletedSchema = z.object({ deleted: z.literal(true) });

export function registerLibraryRoutes(
  app: OpenAPIHono,
  config: Config,
  auth: Auth,
  db?: Database,
) {
  app.use("/api/library/*", async (c, next) => {
    c.header("Cache-Control", "private, no-store");
    await next();
  });
  const library = db ? new LibraryService(db, config) : null;
  type Access = {
    service: LibraryService;
    userId: string;
    accountId: string | null;
  };
  const run = async <T>(
    c: Context,
    mutation: boolean,
    needsSteam: boolean,
    work: (access: Access) => Promise<T>,
  ) => {
    c.header("Cache-Control", "private, no-store");
    try {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session)
        throw new LibraryError("Sign in to use your personal library.", 401);
      if (mutation && c.req.header("origin") !== config.webUrl)
        throw new LibraryError("Reload Tito and try saving again.", 403);
      if (needsSteam && !session.user.steamId)
        throw new LibraryError(
          "Connect Steam to use your own saved matches.",
          403,
        );
      if (!library)
        throw new LibraryError(
          "Library storage is temporarily unavailable.",
          503,
        );
      const accountId = session.user.steamId
        ? parseAccountId(session.user.steamId)
        : null;
      return c.json(
        await work({ service: library, userId: session.user.id, accountId }),
        200,
      );
    } catch (error) {
      if (!(error instanceof LibraryError)) throw error;
      return c.json({ error: error.message }, error.status);
    }
  };
  // No provider is injected: the library only reads or writes bounded private saved data.
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/library/pools",
      operationId: "getSavedHeroPools",
      responses: {
        200: json(
          z.object({ pools: z.array(poolSchema).length(5) }),
          "Private saved library data",
        ),
        ...errors,
      },
    }),
    async (c) =>
      run(c, false, false, async ({ service, userId, accountId }) => ({
        pools: await service.pools(userId),
      })),
  );
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/library/pools/{role}",
      operationId: "getSavedHeroPool",
      request: { params: roleParams },
      responses: {
        200: json(poolSchema, "Private saved library data"),
        ...errors,
      },
    }),
    async (c) =>
      run(c, false, false, async ({ service, userId, accountId }) =>
        service.pool(userId, c.req.valid("param").role),
      ),
  );
  app.openapi(
    createRoute({
      method: "put",
      path: "/api/library/pools/{role}",
      operationId: "saveHeroPool",
      request: { params: roleParams, body: body(poolInputSchema) },
      responses: {
        200: json(poolSchema, "Private saved library data"),
        ...errors,
      },
    }),
    async (c) =>
      run(c, true, false, async ({ service, userId, accountId }) =>
        service.putPool(userId, c.req.valid("param").role, c.req.valid("json")),
      ),
  );
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/library/notes",
      operationId: "getSavedMatchNotes",
      responses: {
        200: json(
          z.object({ notes: z.array(noteSchema).max(200) }),
          "Private saved library data",
        ),
        ...errors,
      },
    }),
    async (c) =>
      run(c, false, true, async ({ service, userId, accountId }) => ({
        notes: await service.notes(userId, accountId),
      })),
  );
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/library/notes/{matchId}",
      operationId: "getSavedMatchNote",
      request: { params: matchParams },
      responses: {
        200: json(
          z.object({ note: noteSchema.nullable() }),
          "Private saved library data",
        ),
        ...errors,
      },
    }),
    async (c) =>
      run(c, false, true, async ({ service, userId, accountId }) => ({
        note: await service.note(
          userId,
          accountId,
          c.req.valid("param").matchId,
        ),
      })),
  );
  app.openapi(
    createRoute({
      method: "put",
      path: "/api/library/notes/{matchId}",
      operationId: "saveMatchNote",
      request: { params: matchParams, body: body(noteInputSchema) },
      responses: {
        200: json(noteSchema, "Private saved library data"),
        ...errors,
      },
    }),
    async (c) =>
      run(c, true, true, async ({ service, userId, accountId }) =>
        service.putNote(
          userId,
          accountId!,
          c.req.valid("param").matchId,
          c.req.valid("json"),
        ),
      ),
  );
  app.openapi(
    createRoute({
      method: "delete",
      path: "/api/library/notes/{matchId}",
      operationId: "deleteMatchNote",
      request: { params: matchParams },
      responses: {
        200: json(deletedSchema, "Private saved library data"),
        ...errors,
      },
    }),
    async (c) =>
      run(c, true, true, async ({ service, userId, accountId }) =>
        service.deleteNote(userId, accountId!, c.req.valid("param").matchId),
      ),
  );
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/library/feedback/{matchId}",
      operationId: "getReviewFeedback",
      request: { params: matchParams },
      responses: {
        200: json(
          z.object({ feedback: feedbackSchema.nullable() }),
          "Private saved library data",
        ),
        ...errors,
      },
    }),
    async (c) =>
      run(c, false, true, async ({ service, userId, accountId }) => ({
        feedback: await service.feedback(
          userId,
          accountId,
          c.req.valid("param").matchId,
        ),
      })),
  );
  app.openapi(
    createRoute({
      method: "put",
      path: "/api/library/feedback/{matchId}",
      operationId: "saveReviewFeedback",
      request: { params: matchParams, body: body(feedbackInputSchema) },
      responses: {
        200: json(feedbackSchema, "Private saved library data"),
        ...errors,
      },
    }),
    async (c) =>
      run(c, true, true, async ({ service, userId, accountId }) =>
        service.putFeedback(
          userId,
          accountId!,
          c.req.valid("param").matchId,
          c.req.valid("json"),
        ),
      ),
  );
  app.openapi(
    createRoute({
      method: "delete",
      path: "/api/library/feedback/{matchId}",
      operationId: "deleteReviewFeedback",
      request: { params: matchParams },
      responses: {
        200: json(deletedSchema, "Your review feedback was cleared"),
        ...errors,
      },
    }),
    async (c) =>
      run(c, true, true, async ({ service, userId, accountId }) =>
        service.deleteFeedback(
          userId,
          accountId!,
          c.req.valid("param").matchId,
        ),
      ),
  );
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/library/drafts",
      operationId: "getSavedDrafts",
      responses: {
        200: json(
          z.object({ drafts: z.array(draftSnapshotSchema).max(50) }),
          "Private saved library data",
        ),
        ...errors,
      },
    }),
    async (c) =>
      run(c, false, false, async ({ service, userId, accountId }) => ({
        drafts: await service.drafts(userId, accountId),
      })),
  );
  app.openapi(
    createRoute({
      method: "post",
      path: "/api/library/drafts",
      operationId: "saveDraftSnapshot",
      request: { body: body(draftSnapshotInputSchema) },
      responses: {
        200: json(draftSnapshotSchema, "Private saved library data"),
        ...errors,
      },
    }),
    async (c) =>
      run(c, true, false, async ({ service, userId, accountId }) =>
        service.createDraft(userId, accountId, c.req.valid("json")),
      ),
  );
  app.openapi(
    createRoute({
      method: "patch",
      path: "/api/library/drafts/{id}",
      operationId: "updateDraftSnapshot",
      request: { params: draftParams, body: body(draftUpdateSchema) },
      responses: {
        200: json(draftSnapshotSchema, "Private saved library data"),
        ...errors,
      },
    }),
    async (c) =>
      run(c, true, false, async ({ service, userId, accountId }) =>
        service.updateDraft(
          userId,
          accountId,
          c.req.valid("param").id,
          c.req.valid("json"),
        ),
      ),
  );
  app.openapi(
    createRoute({
      method: "delete",
      path: "/api/library/drafts/{id}",
      operationId: "deleteDraftSnapshot",
      request: { params: draftParams },
      responses: {
        200: json(deletedSchema, "Private saved library data"),
        ...errors,
      },
    }),
    async (c) =>
      run(c, true, false, async ({ service, userId, accountId }) =>
        service.deleteDraft(userId, accountId, c.req.valid("param").id),
      ),
  );
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/library/usage",
      operationId: "getPersonalAiUsage",
      responses: {
        200: json(usageSchema, "Private saved library data"),
        ...errors,
      },
    }),
    async (c) =>
      run(c, false, false, async ({ service, userId, accountId }) =>
        service.usage(userId),
      ),
  );
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/library/heroes",
      operationId: "getPersonalHeroes",
      responses: {
        200: json(
          z.object({ heroes: z.array(heroSummarySchema) }),
          "Private saved library data",
        ),
        ...errors,
      },
    }),
    async (c) =>
      run(c, false, true, async ({ service, userId, accountId }) => ({
        heroes: await service.heroes(userId, accountId),
      })),
  );
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/library/heroes/{heroId}",
      operationId: "getPersonalHero",
      request: { params: heroParams },
      responses: {
        200: json(heroDetailSchema, "Private saved library data"),
        ...errors,
      },
    }),
    async (c) =>
      run(c, false, true, async ({ service, userId, accountId }) =>
        service.hero(userId, accountId, c.req.valid("param").heroId),
      ),
  );
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/library/reflection",
      operationId: "getSessionReflection",
      request: { query: reflectionQuerySchema },
      responses: {
        200: json(reflectionSchema, "Private saved library data"),
        ...errors,
      },
    }),
    async (c) =>
      run(c, false, true, async ({ service, userId, accountId }) =>
        service.reflection(userId, accountId, c.req.valid("query")),
      ),
  );
}
