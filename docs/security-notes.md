# Known security notes

Reviewed November 8, 2026. This records the dependency audit result, not a complete security certification.

## Development dependency advisory

`bun audit` reports one moderate finding, [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99), for `esbuild@0.18.20` through `drizzle-kit@0.31.11 → @esbuild-kit/esm-loader → @esbuild-kit/core-utils`.

The advisory concerns esbuild's development-server CORS behavior; the fixed version is 0.25.0. Tito's Vite app uses a newer esbuild, and the Bun API build does not use esbuild's development server. Do not start the affected package's standalone `serve` feature. A working local build is not proof that every dependency path is unreachable.

`bun audit --production --json` reported no advisories in the production dependency set. This is a point-in-time registry result, not a guarantee of safety.

`bun audit fix --dry-run` cannot resolve this within the current dependent range (`~0.18.20`). A forced override or a database-tool migration has not been applied. Revisit when Drizzle Kit removes the legacy loader, or validate a targeted dependency change separately. This advisory does not by itself prevent publishing the source code.

## Before a hosted release

Verify real Steam/email callbacks, live AI availability and quality, same-origin proxy configuration, backups, resource limits, and provider billing controls in a staging deployment. These checks are separate from publishing the repository. Enable GitHub secret scanning/push protection and private vulnerability reporting when the repository is created; local files cannot configure those account settings.
