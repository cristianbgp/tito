import { initializeLocale } from "./i18n";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./app";
import { ApiError } from "./api/transport";
import "./styles.css";
import { AppearanceProvider } from "./components/appearance";

initializeLocale();

const client = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: (count, error) =>
        count < 1 && !(error instanceof ApiError && error.status < 500),
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppearanceProvider>
      <QueryClientProvider client={client}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </AppearanceProvider>
  </StrictMode>,
);
