import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { expect, it } from "vitest";
import { AccountPage } from "./account";

it("explains a failed Steam linking callback instead of silently returning to the account", () => {
  const client = new QueryClient();
  const html = renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(
        MemoryRouter,
        { initialEntries: ["/account?error=STEAM_ACCOUNT_ALREADY_LINKED"] },
        createElement(AccountPage),
      ),
    ),
  );
  expect(html).toContain('role="alert"');
  expect(html).toContain("Steam could not be connected");
  client.clear();
});
