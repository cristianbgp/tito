import { getLocale } from "../i18n";
import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { steamOpenIDClient } from "better-auth-steam/client";
import type { Auth } from "../../../api/src/auth";

export const authClient = createAuthClient({
  fetchOptions: {
    onRequest: (context) => {
      context.headers.set("Accept-Language", getLocale());
    },
  },
  plugins: [steamOpenIDClient(), inferAdditionalFields<Auth>()],
});
