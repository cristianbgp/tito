import { makeSignature } from "better-auth/crypto";
import type { Auth } from "../auth";

/** A persisted pre-existing account/session fixture, never an email login route. */
export async function existingTestSession(auth: Auth, email: string) {
  const context = await auth.$context;
  const user = await context.internalAdapter.createUser(
    {
      email,
      name: "Test Player",
      emailVerified: true,
    },
    { method: "test" },
  );
  const session = await context.internalAdapter.createSession(user.id);
  const signature = await makeSignature(session.token, context.secret);
  const cookie = `${context.authCookies.sessionToken.name}=${session.token}.${signature}`;
  const original = await auth.api.getSession({
    headers: new Headers({ Cookie: cookie }),
  });
  if (!original)
    throw new Error("Existing account fixture has no persisted session");
  return { cookie, original };
}
