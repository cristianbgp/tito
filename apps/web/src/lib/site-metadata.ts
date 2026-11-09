export const siteTitle = "Tito | Your next game, better.";
export const siteDescription =
  "Your Dota 2 companion for match insights, hero picks and better decisions.";
export const socialImageAlt =
  "Tito's multicolor orb with the words Your next game, better. A Dota 2 companion.";
type MetadataOptions = {
  publicUrl?: string;
  deploymentUrl?: string;
  developmentUrl?: string;
};
export function resolveSiteMetadata(options: MetadataOptions = {}) {
  const value =
    options.publicUrl ||
    options.deploymentUrl ||
    options.developmentUrl ||
    "https://tito.localhost";
  const url = new URL(value);
  const local =
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.hostname.endsWith(".localhost");
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" && !local)
  )
    throw new Error(
      "PUBLIC_SITE_URL must be an HTTPS origin without credentials, path, query or fragment. Local HTTP is allowed for development.",
    );
  return {
    url: url.origin + "/",
    image: new URL("/brand/og-image.png", url).href,
    robots: options.publicUrl && !local ? "index,follow" : "noindex,nofollow",
  };
}
export function renderSiteMetadata(
  site: ReturnType<typeof resolveSiteMetadata>,
) {
  const escape = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  const meta = (key: string, value: string, property = false) =>
    `<meta ${property ? "property" : "name"}="${key}" content="${escape(value)}" />`;
  return [
    `<title>${siteTitle}</title>`,
    meta("description", siteDescription),
    meta("application-name", "Tito"),
    meta("apple-mobile-web-app-title", "Tito"),
    meta("robots", site.robots),
    meta("referrer", "strict-origin-when-cross-origin"),
    `<link rel="canonical" href="${escape(site.url)}" />`,
    ...Object.entries({
      "og:type": "website",
      "og:site_name": "Tito",
      "og:title": siteTitle,
      "og:description": siteDescription,
      "og:url": site.url,
      "og:locale": "en_US",
      "og:image": site.image,
      "og:image:type": "image/png",
      "og:image:width": "1200",
      "og:image:height": "630",
      "og:image:alt": socialImageAlt,
      ...(site.image.startsWith("https:")
        ? { "og:image:secure_url": site.image }
        : {}),
    }).map(([key, value]) => meta(key, value, true)),
    ...Object.entries({
      "twitter:card": "summary_large_image",
      "twitter:title": siteTitle,
      "twitter:description": siteDescription,
      "twitter:image": site.image,
      "twitter:image:alt": socialImageAlt,
    }).map(([key, value]) => meta(key, value)),
  ].join("\n");
}
