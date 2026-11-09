import { createRoute, type OpenAPIHono, type z } from "@hono/zod-openapi";
import type { Auth } from "../auth";
import type { Config } from "../config";
import type { Database } from "../db";
import { errorSchema } from "../dota/schemas";
import { profileInputSchema, profileSchema } from "./contracts";
import { getPlayerProfile, savePlayerProfile } from "./service";

const json = <T extends z.ZodType>(schema: T, description: string) => ({
  content: { "application/json": { schema } },
  description,
});
const authErrors = {
  401: json(errorSchema, "Sign-in required"),
  503: json(errorSchema, "Profile storage unavailable"),
};

export function registerProfileRoutes(
  app: OpenAPIHono,
  config: Config,
  auth: Auth,
  db?: Database,
) {
  app.use("/api/profile", async (c, next) => {
    c.header("Cache-Control", "private, no-store");
    await next();
  });

  app.openapi(
    createRoute({
      method: "get",
      path: "/api/profile",
      operationId: "getPlayerProfile",
      responses: {
        200: json(profileSchema, "Your saved player preferences"),
        ...authErrors,
      },
    }),
    async (c) => {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session)
        return c.json({ error: "Sign in to view your player profile." }, 401);
      if (!db)
        return c.json(
          { error: "Player profiles are temporarily unavailable." },
          503,
        );
      return c.json(
        await getPlayerProfile(db, session.user.id, session.user.steamId),
        200,
      );
    },
  );

  app.openapi(
    createRoute({
      method: "put",
      path: "/api/profile",
      operationId: "updatePlayerProfile",
      request: {
        body: {
          required: true,
          content: { "application/json": { schema: profileInputSchema } },
        },
      },
      responses: {
        200: json(profileSchema, "Saved player preferences"),
        400: json(errorSchema, "Invalid preferences"),
        403: json(errorSchema, "Untrusted write origin"),
        ...authErrors,
      },
    }),
    async (c) => {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session)
        return c.json({ error: "Sign in to save your player profile." }, 401);
      if (c.req.header("origin") !== config.webUrl)
        return c.json({ error: "Reload Tito and try saving again." }, 403);
      if (!db)
        return c.json(
          { error: "Player profiles are temporarily unavailable." },
          503,
        );
      return c.json(
        await savePlayerProfile(
          db,
          session.user.id,
          c.req.valid("json"),
          session.user.steamId,
        ),
        200,
      );
    },
  );
}
