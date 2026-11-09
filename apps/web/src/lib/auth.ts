import { getLocale } from "../i18n";
import { createAuthClient } from "better-auth/react";
import { steamOpenIDClient } from "better-auth-steam/client";

export const authClient = createAuthClient({
  fetchOptions: {
    onRequest: (context) => {
      context.headers.set("Accept-Language", getLocale());
    },
  },
  plugins: [steamOpenIDClient()],
});
