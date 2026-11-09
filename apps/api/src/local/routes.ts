import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import type { Auth } from "../auth";
import { isLocalUrl, type Config } from "../config";
import { errorSchema } from "../dota/schemas";
import { LocalGameState, LocalStateError } from "./game-state";
const json = (schema: z.ZodType, description: string) => ({
  content: { "application/json": { schema } },
  description,
});
const stateSchema = z
  .object({
    supported: z.boolean(),
    configured: z.boolean(),
    expiresAt: z.string().nullable(),
    receivedAt: z.string().nullable(),
    stale: z.boolean(),
    matchId: z.string().nullable(),
    team: z.string().nullable(),
    ownHeroId: z.number().nullable(),
    allies: z.array(z.number()),
    enemies: z.array(z.number()),
    bans: z.array(z.number()),
    partial: z.boolean(),
  })
  .openapi("LocalGameSnapshot");
const setupSchema = z
  .object({
    filename: z.string(),
    expiresAt: z.string(),
    receiverUrl: z.string(),
    launchOption: z.string(),
    configuration: z.string(),
  })
  .openapi("LocalGameSetup");
export function registerLocalRoutes(
  app: OpenAPIHono,
  config: Config,
  auth: Auth,
) {
  const supported = !config.production && isLocalUrl(config.webUrl);
  const state = new LocalGameState(config.port);
  app.openapi(
    createRoute({
      method: "get",
      path: "/api/local/game-state",
      operationId: "getLocalGameState",
      responses: {
        200: json(stateSchema, "Your local game connection"),
        401: json(errorSchema, "Sign in required"),
      },
    }),
    async (c) => {
      c.header("Cache-Control", "private, no-store");
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session)
        return c.json({ error: "Sign in to use local game integration." }, 401);
      return c.json({ ...state.status(session.user.id), supported }, 200);
    },
  );
  app.openapi(
    createRoute({
      method: "post",
      path: "/api/local/game-state/setup",
      operationId: "setupLocalGameState",
      request: {
        body: {
          required: true,
          content: { "application/json": { schema: z.object({}).strict() } },
        },
      },
      responses: {
        200: json(setupSchema, "Ephemeral local game configuration"),
        401: json(errorSchema, "Sign in required"),
        403: json(errorSchema, "Local setup unavailable"),
        429: json(errorSchema, "Wait before setup"),
      },
    }),
    async (c) => {
      c.header("Cache-Control", "private, no-store");
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session)
        return c.json(
          { error: "Sign in to create a local game configuration." },
          401,
        );
      if (!supported || c.req.header("origin") !== config.webUrl)
        return c.json(
          {
            error:
              "Game integration setup is available only in your local Tito environment.",
          },
          403,
        );
      try {
        return c.json(state.setup(session.user.id), 200);
      } catch (error) {
        if (!(error instanceof LocalStateError)) throw error;
        return c.json({ error: error.message }, 429);
      }
    },
  );
  if (supported)
    app.post("/api/local/gsi", async (c) => {
      c.header("Cache-Control", "no-store");
      if (
        !isLocalUrl(c.req.url) ||
        (c.req.header("origin") && c.req.header("origin") !== config.webUrl)
      )
        return c.json({ error: "Local game input only." }, 403);
      try {
        return c.json(state.ingest(await c.req.json()), 200);
      } catch (error) {
        if (error instanceof LocalStateError)
          return c.json({ error: error.message }, error.status);
        return c.json({ error: "Invalid game payload." }, 400);
      }
    });
}
