import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import type { Auth } from "../auth";
import type { Config } from "../config";
import { errorSchema, parseRequestSchema, parseStatusSchema } from "./schemas";
import type { OpenDota } from "./opendota";

const json = (schema: z.ZodType, description: string) => ({
  content: { "application/json": { schema } },
  description,
});
const errors = Object.fromEntries(
  [400, 401, 403, 404, 429, 502, 504].map((status) => [
    status,
    json(errorSchema, "Request unavailable"),
  ]),
) as Record<400 | 401 | 403 | 404 | 429 | 502 | 504, ReturnType<typeof json>>;
const identifier = z.string().regex(/^[1-9]\d{0,15}$/);

export function registerReplayRoutes(
  app: OpenAPIHono,
  config: Config,
  auth: Auth,
  dota: OpenDota,
) {
  const cooldown = new Map<string, number>();
  function allowed(userId: string, action: string, milliseconds: number) {
    const now = Date.now();
    for (const [key, until] of cooldown) if (until <= now) cooldown.delete(key);
    const key = `${action}:${userId}`;
    if ((cooldown.get(key) ?? 0) > now || cooldown.size >= 10000) return false;
    cooldown.set(key, now + milliseconds);
    return true;
  }

  app.openapi(
    createRoute({
      method: "post",
      path: "/api/matches/{matchId}/parse",
      operationId: "requestMatchParse",
      request: { params: z.object({ matchId: identifier }) },
      responses: {
        202: json(parseRequestSchema, "Replay analysis queued"),
        ...errors,
      },
    }),
    async (c) => {
      c.header("Cache-Control", "private, no-store");
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session)
        return c.json({ error: "Sign in to request replay analysis." }, 401);
      if (c.req.header("origin") !== config.webUrl)
        return c.json({ error: "Reload Tito and try again." }, 403);
      if (!allowed(session.user.id, "submit", 15000)) {
        c.header("Retry-After", "15");
        return c.json(
          { error: "Wait 15 seconds before requesting another replay." },
          429,
        );
      }
      return c.json(await dota.requestParse(c.req.valid("param").matchId), 202);
    },
  );

  app.openapi(
    createRoute({
      method: "get",
      path: "/api/matches/{matchId}/parse/{jobId}",
      operationId: "getMatchParseStatus",
      request: { params: z.object({ matchId: identifier, jobId: identifier }) },
      responses: {
        200: json(parseStatusSchema, "Replay analysis progress"),
        ...errors,
      },
    }),
    async (c) => {
      c.header("Cache-Control", "private, no-store");
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session)
        return c.json({ error: "Sign in to check replay analysis." }, 401);
      const { matchId, jobId } = c.req.valid("param");
      if (!allowed(session.user.id, `poll:${jobId}`, 8000)) {
        c.header("Retry-After", "8");
        return c.json(
          { error: "Wait a moment before checking replay analysis again." },
          429,
        );
      }
      return c.json(await dota.parseStatus(matchId, jobId), 200);
    },
  );
}
