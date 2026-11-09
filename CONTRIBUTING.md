# Contributing to Tito

Tito is an experimental Dota 2 companion. Bug fixes, clearer explanations, accessibility improvements, and English/Spanish contributions are welcome.

## Local setup

Follow [the README](README.md#run-locally). Use Bun 1.4.4 or later, Node.js 24 or later, and PostgreSQL. Install from the repository root with `bun install --frozen-lockfile`. The default local inbox needs no email provider or API key.

For a focused change, describe the user-visible problem and keep the implementation within that scope. For larger features or dependency changes, discuss the approach in an issue first. Never include personal matches, account exports, local mail, tokens, or environment files in an issue or PR. Use synthetic fixtures.

## Conventions

- Use TypeScript, the existing shadcn/Base UI components, Tailwind utilities, and semantic theme tokens. Preserve light and dark modes.
- Add corresponding English and Spanish copy. Subscribe React components with `useLocale()` and resolve copy during rendering.
- Consume generated API types/hooks. Edit the route/schema sources, then run `bun run generate:api`; do not hand-edit generated clients.
- Keep paid provider work explicit and bounded. No background AI calls or credentials in browser bundles.
- Store game clocks as seconds and format them for display. Keep unavailable data distinct from zero; do not invent replay events or imply causal conclusions from totals.
- For database changes, generate and inspect migrations with `bun run db:generate`. Include SQL and Drizzle metadata. Migrations must preserve existing data.
- Keep `patches/better-auth-steam@0.2.3.patch` when installing/building. Authentication upgrades require reviewing the patch and its tests together.

## Verification

```sh
bun run check
```

This runs API/web type checks, Vitest, both builds, and formatting. Meaningful behavior changes should have regression coverage. The regular suite uses synthetic fixtures and PGlite; it does not need provider keys. Three real PostgreSQL checks are skipped unless configured.

With a development PostgreSQL role that has `CREATEDB` permission:

```sh
bun run test:postgres
```

That command loads `apps/api/.env`, creates unique disposable `tito_test_*` databases, and removes only those databases. It never resets the application database. The separate PostgreSQL workflow runs these checks against an isolated service for backend, shared-code, dependency, or database-workflow changes, without provider credentials. It can also be started manually from Actions. Frontend-only changes skip it. If enabling branch protection, require **Checks and build**; the path-filtered PostgreSQL workflow does not run on every PR.

Use `bun audit` to review dependency advisories. See [known security notes](docs/security-notes.md) for the current development-tool finding. Report vulnerabilities privately according to [SECURITY.md](SECURITY.md).

## Pull requests

Explain what changed and why, include relevant validation, and show screenshots for visual changes. Check narrow layouts, long Spanish text, keyboard interaction, and both themes when affected. Keep generated files and the lockfile consistent with source changes.

Contributions are made under Tito's [MIT license](LICENSE). Preserve third-party notices and avoid adding assets without clear provenance.
