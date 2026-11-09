# Tito brand

The selected direction is **Pure Dot**: a small, friendly Dota companion. Always write the name **tito** in the logo; use Tito in ordinary prose. The orb is an original abstract companion mark, with a nod to a wisp rather than a recreation of a Dota hero.

## Static assets

All assets live in `apps/web/public/brand/` and are served from `/brand/`.

| Asset                                         | Use                                                       |
| --------------------------------------------- | --------------------------------------------------------- |
| `isotype-512.png`                             | Standalone color orb, transparent, 512 × 512              |
| `isotype-180.png`                             | App header and Apple touch icon                           |
| `isotype-32.png`                              | Browser favicon                                           |
| `logotype-ink.png`                            | Wordmark only, for light backgrounds                      |
| `logotype-white.png`                          | Wordmark only, for dark backgrounds                       |
| `logo-ink.png`                                | Combined orb and wordmark, for light backgrounds          |
| `logo-white.png`                              | Combined orb and wordmark, for dark backgrounds           |
| `isotype.svg`, `logotype-*.svg`, `logo-*.svg` | Self-contained SVG packages of the same generated artwork |
| `selected-concept.png`                        | Approved first concept, retained as the visual reference  |

The SVG files **embed raster artwork**; they are not editable vector paths. PNGs preserve alpha. Export masks remove extraction residue outside the orb silhouette and share one wordmark shape across both colors. The app requests the smaller PNG exports rather than the large SVG packages. A vector reconstruction can follow when print or a fully procedural AI orb needs it.

## Usage

- **Isotype:** the orb alone, for icons and compact companion identity.
- **Logotype:** the lowercase `tito` lettering alone.
- **Combined logo:** orb to the left of the lettering, centered vertically.
- Use the same color orb in both themes. Use ink lettering on light surfaces and white lettering on dark surfaces.
- Preserve the circle and asset aspect ratios. Leave clear space of at least one quarter of the orb diameter around the combined mark.
- Keep the orb at least 24px in app UI; the dedicated 32px favicon export is the small-icon exception. The standard header uses a 36px orb with a 52 × 26px wordmark; phones use 28px with 42 × 21px.
- Keep the brand static in navigation. Do not add an ambient pulse, spinning ring, additional satellites, or an external glow.
- Palette cues: sky blue, periwinkle, lavender and peach within the orb; ink `#171a20` and white `#ffffff` lettering. Use the artwork itself for its gradients rather than recreating them with CSS.

`BrandLogo` and `BrandMark` in `apps/web/src/components/brand.tsx` are decorative components. Their containing link or control must provide an accessible name; the header link uses the existing i18n brand entry. The wordmark changes ink through CSS when the root appearance changes, using one identical silhouette.

## Future AI interaction

Reserved for a later feature: a code-driven orb using the same silhouette and palette, with a restrained pulse tied to actual AI activity. Define idle, processing and response states when that feature is built; do not imply activity while idle. Keep the navigation logo static, expose a text status to assistive technology, and show a static alternative under reduced motion. No AI animation or model call is included in this brand change.

## Social sharing and metadata

`/brand/og-image.png` is the 1200×630 social preview. Its editable composition is `og-image.svg`; it reuses the approved orb/wordmark and glass palette. Serve the PNG to social crawlers. The existing 32px favicon and 180px Apple touch icon remain in the HTML head.

Vite writes the title, description, canonical URL, Open Graph image/dimensions/alt text, X large-image card and robots policy directly into HTML. Crawlers do not need JavaScript. Page headings update browser-tab titles separately. Previews use generic brand copy and contain no personal match or account data.

Set `PUBLIC_SITE_URL` at frontend build time to the real HTTPS origin. Cloudflare preview builds fall back to `CF_PAGES_URL`; local builds use the local origin and emit a reminder before manual deployment. Local/automatic-preview metadata defaults to `noindex,nofollow`. Only a configured public origin is indexable. Do not add Spanish locale tags until those pages actually exist.
