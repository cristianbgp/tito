import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import type { Context } from "hono";
import type { Auth } from "../auth";
import type { Config } from "../config";
import { parseAccountId } from "../dota/opendota";
import { errorSchema } from "../dota/schemas";
import { importCapabilities, importInput, importState } from "./contracts";
import { ReplayError } from "./errors";
import type { ReplayImports } from "./imports";

const json = (schema: z.ZodType, description: string) => ({
  content: { "application/json": { schema } },
  description,
});
const errors = {
  400: json(errorSchema, "Invalid replay"),
  401: json(errorSchema, "Sign-in required"),
  403: json(errorSchema, "Steam identity or origin required"),
  404: json(errorSchema, "Upload expired"),
  409: json(errorSchema, "Upload conflict"),
  413: json(errorSchema, "Upload too large"),
  429: json(errorSchema, "Import capacity reached"),
  503: json(errorSchema, "Import unavailable"),
};
const params = z.object({ id: z.uuid() });
export function registerReplayImportRoutes(
  app: OpenAPIHono,
  config: Config,
  auth: Auth,
  imports: ReplayImports | null,
) {
  async function owner(c: Context) {
    c.header("Cache-Control", "private, no-store");
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) throw new ReplayError("Sign in to import your replays.", 401);
    if (!session.user.steamId)
      throw new ReplayError("Connect Steam to import your own replays.", 403);
    if (c.req.method !== "GET" && c.req.header("origin") !== config.webUrl)
      throw new ReplayError("Reload Tito and try importing again.", 403);
    if (!imports)
      throw new ReplayError(
        "Replay import is not available on this server yet.",
        503,
      );
    return {
      id: session.user.id,
      accountId: parseAccountId(session.user.steamId),
      imports,
    };
  }
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/replays/capabilities",
      operationId: "getReplayImportCapabilities",
      responses: {
        200: json(importCapabilities, "Replay import availability and limits"),
        ...errors,
      },
    }),
    async (c) => {
      const user = await owner(c);
      return c.json(await user.imports.capabilities(user.id), 200);
    },
  );
  app.openapi(
    createRoute({
      method: "post",
      path: "/api/replays/imports",
      operationId: "startReplayImport",
      request: {
        body: {
          required: true,
          content: { "application/json": { schema: importInput } },
        },
      },
      responses: {
        201: json(importState, "Private replay upload created"),
        ...errors,
      },
    }),
    async (c) => {
      const user = await owner(c);
      return c.json(
        await user.imports.begin(
          user.id,
          user.accountId,
          c.req.valid("json").size,
        ),
        201,
      );
    },
  );
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/replays/imports/{id}",
      operationId: "getReplayImport",
      request: { params },
      responses: {
        200: json(importState, "Your replay import progress"),
        ...errors,
      },
    }),
    async (c) => {
      const user = await owner(c);
      return c.json(
        await user.imports.status(user.id, c.req.valid("param").id),
        200,
      );
    },
  );
  app.openapi(
    createRoute({
      method: "put",
      path: "/api/replays/imports/{id}",
      operationId: "uploadReplayChunk",
      request: {
        params,
        query: z.object({ offset: z.coerce.number().int().min(0) }),
        body: {
          required: true,
          content: {
            "application/octet-stream": {
              schema: z.string().openapi({ type: "string", format: "binary" }),
            },
          },
        },
      },
      responses: { 200: json(importState, "Replay chunk accepted"), ...errors },
    }),
    async (c) => {
      const user = await owner(c);
      return c.json(
        await user.imports.chunk(
          user.id,
          c.req.valid("param").id,
          c.req.valid("query").offset,
          new Uint8Array(await c.req.arrayBuffer()),
        ),
        200,
      );
    },
  );
  app.openapi(
    createRoute({
      method: "post",
      path: "/api/replays/imports/{id}/complete",
      operationId: "completeReplayImport",
      request: { params },
      responses: {
        202: json(importState, "Replay processing started"),
        ...errors,
      },
    }),
    async (c) => {
      const user = await owner(c);
      return c.json(
        await user.imports.complete(user.id, c.req.valid("param").id),
        202,
      );
    },
  );
  app.openapi(
    createRoute({
      method: "delete",
      path: "/api/replays/imports/{id}",
      operationId: "cancelReplayImport",
      request: { params },
      responses: {
        200: json(importState, "Temporary upload cancelled"),
        ...errors,
      },
    }),
    async (c) => {
      const user = await owner(c);
      return c.json(
        await user.imports.cancel(user.id, c.req.valid("param").id),
        200,
      );
    },
  );
}
