import { defineConfig, loadEnv } from "vite";
import {
  renderSiteMetadata,
  resolveSiteMetadata,
} from "./src/lib/site-metadata";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, import.meta.dirname, "PUBLIC_");
  const metadata = resolveSiteMetadata({
    publicUrl: env.PUBLIC_SITE_URL,
    deploymentUrl: command === "build" ? process.env.CF_PAGES_URL : undefined,
    developmentUrl:
      process.env.PORTLESS_URL ??
      process.env.WEB_URL ??
      `http://localhost:${process.env.PORT ?? 5173}`,
  });
  return {
    plugins: [
      react(),
      tailwind(),
      {
        name: "tito-social-metadata",
        buildStart() {
          if (
            command === "build" &&
            !env.PUBLIC_SITE_URL &&
            !process.env.CF_PAGES_URL
          )
            this.warn(
              "PUBLIC_SITE_URL is unset. Social metadata uses the local origin; set the public HTTPS domain before deploying a manual build.",
            );
        },
        transformIndexHtml(html) {
          return html.replace(
            "<!-- tito:metadata -->",
            renderSiteMetadata(metadata),
          );
        },
      },
    ],
    resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
    server: {
      host: "127.0.0.1",
      port: Number(process.env.PORT ?? 5173),
      strictPort: true,
      allowedHosts: ["tito.localhost"],
      proxy: {
        "/api": {
          target: process.env.API_URL ?? "http://127.0.0.1:3001",
          changeOrigin: true,
        },
      },
    },
  };
});
