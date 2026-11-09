# Feature and implementation guide

A Dota 2 improvement companion with account creation, saved player preferences, match history, detailed match exploration, personal progress trends, and on-demand AI match reviews. The interface supports English and Latin American Spanish.

## Appearance

The static Tito orb, wordmark and combined logos are available in `apps/web/public/brand/`. See [brand usage and assets](brand.md) for light/dark exports and the future AI interaction direction.

The app uses a shared glass interface: floating navigation, player search, recent matches, and a selected-match preview. Choose **Light**, **Dark**, or **System** in the top toolbar. System is the default; an explicit choice is saved in this browser and synchronized across tabs. Dark uses charcoal, warm copper, and cool blue; light uses pearl, pale blue, and peach. Account, sign-in, match details, and charts use the same palettes.

On desktop, the sidebar button beside search switches between full navigation and an 80px icon rail. **⌘B** on Mac or **Ctrl+B** on Windows/Linux also toggles it, following the [shadcn sidebar shortcut](https://ui.shadcn.com/docs/components/base/sidebar#keyboard-shortcut). This preference is stored as `tito:sidebar` in local storage, restored on reload, and synchronized across tabs. Shortcuts leave editable fields alone. Navigation keeps accessible labels and hover titles when collapsed; mobile retains the full top navigation and does not expose the desktop toggle.

Shared controls now use **shadcn/ui with Base UI**. The locally owned source lives in `apps/web/src/components/ui/`; `apps/web/components.json` selects the official `base-nova` registry and the existing Phosphor icon family. Buttons, inputs, selects, toggle groups, sliders, and collapsibles use Base UI primitives; cards, tables, labels, badges, and alerts share the same glass tokens. Navigation remains semantic links styled with `buttonVariants`, so screen-reader link navigation and ordinary browser link behavior are preserved.

Add future components with `bunx shadcn@latest add <component> --cwd apps/web`. Review the generated source and dependency changes, reuse `@/lib/utils` for class merging, and adapt its styling to the existing semantic tokens rather than overwriting the theme. `@/` is configured in Vite, TypeScript, and Vitest. The account route loads its select/dropdown code on demand.

Select a hero in the recent-match list to preview its statistics, then choose **Open match** for the full scoreboard. **Explore timeline** reveals the preview chart's keyboard/touch slider and numeric data. Missing replay data remains explicitly unavailable. Narrow screens stack the preview below the match list and keep wide tables inside scrolling regions. Reduced-motion and reduced-transparency preferences have corresponding fallbacks.

## Recent matches and hero performance

For your connected Steam account, **Saved match history** offers an explicit **Import my matches**, then **Sync new matches** and **Load older matches**. Each provider import fetches up to 100 summaries. The newest 1,000 imported matches are retained by default, including hero labels/image URLs and nullable K/D/A/GPM/XPM statistics. Saved rows are read from PostgreSQL on a fresh visit, independently of OpenDota availability. **Show more saved matches** expands the loaded database sample without another provider import. The hero overview and filters describe that loaded sample. Saved previews defer provider details until you open the match.

Syncs share a 60-second database cooldown and a fenced lease; duplicate rows are upserted, and failed refreshes keep saved data. A database-backed limit defaults to 1,000 actual OpenDota requests per UTC day across the API. Public lookups of other players and manually selected profile IDs remain temporary; only verified linked Steam ownership permits persistence. No sync runs automatically. See [deployment and cost controls](deployment.md) for retention, configurable ceilings, cache bounds and hosting setup.

Filter loaded matches by hero or match ID, queue (Ranked, Unranked matchmaking, Other or Unknown), game mode (including All Pick, Turbo and Single Draft), and result. Queue and mode filters combine independently. Sort by newest, oldest, longest or shortest. Counts and win rate use only the filtered loaded sample; public lookups return up to 20 recent matches. Unavailable results remain separate and are excluded from win rate. Filters stay in the URL through match-detail/back links; looking up another player resets the view.

Migration `0007_icy_gertrude_yorkes.sql` adds nullable queue metadata to compact saved summaries. Existing rows remain unknown until imported again; **Sync new matches** refreshes the recent import window. Missing queue or mode data can be filtered explicitly and is never guessed. API startup applies the committed migration before serving requests.

**Recent hero performance** groups that full recent sample by hero, showing games, win/loss record, known-result win rate, and average GPM/XPM. Missing statistics are excluded from each average; an unavailable average displays a dash. These are recent-sample statistics, not lifetime hero rankings. Selecting a hero filters the match list by its exact ID, including when metadata only supplies fallback names. Editing the search field switches back to free-text search.

Public lookup results remain visible when a background refresh fails, with a clear update warning. Public results use the current tab's TanStack Query cache and are not archived. A fresh public lookup without cached data needs the provider. Saved history uses the new committed PostgreSQL migration; no additional runtime dependency or API key is required.

## Personal progress

Open **Progress** in navigation to see your verified Steam account's saved statistics. It uses every retained summary (up to 1,000), independently of the match list's display limit, filters or manual profile selection. The API returns compact aggregates and makes no OpenDota or AI requests. A successful history sync invalidates cached progress; Refresh progress rereads the database without syncing matches.

Four cards compare the rolling last 28 days with the immediately preceding 28 days: known-result win rate, deaths per game, GPM and XPM. Each metric shows its own valid sample count and preserves unavailable values as a dash. A change appears only when both periods have at least five valid samples; it uses unrounded values, and win-rate changes use percentage points. These are descriptive imported samples, with no claim of causal improvement or rank/role-adjusted performance.

The eight-week result chart uses Monday-start UTC weeks, including the current partial week. **View weekly numbers** exposes exact counts and per-statistic samples in an accessible table. Empty weeks do not establish that no games were played; history can be incomplete or retention-limited. Signed-out, unlinked and empty-history states point to the relevant sign-in, connection or import step. No extra key, dependency, service or migration is needed for Progress.

## Start locally

Requires Bun 1.4.4 or later, Node.js 24 or later (Portless), and a running PostgreSQL server. Crew is installed as a project dependency. Local email sign-in needs no Steam key or Resend account.

```sh
bun install
cp apps/api/.env.example apps/api/.env
# Edit DATABASE_URL in apps/api/.env to use your PostgreSQL server and credentials.
bun run db:migrate
bun run dev
```

Crew starts the API, web app, and React Email template viewer from `crew.toml`. The API development command checks PostgreSQL and applies committed migrations before starting the server. Select a service in Crew to see its output; Ctrl+Q shuts down the workspace.

| Service         | Portless URL                          |
| --------------- | ------------------------------------- |
| App             | https://tito.localhost                |
| API health      | https://api.tito.localhost/api/health |
| Email templates | https://emails.tito.localhost         |
| Local inbox     | https://tito.localhost/dev/inbox      |

Portless uses its native named routes, assigned ports, and trusted local HTTPS. Public development origins live in `.env.portless`; no secrets belong in that file. If Portless has not been set up on a computer, run `bunx portless proxy start` in an interactive terminal and complete its certificate/proxy prompts before starting Crew. No startup service is installed by this project.

To skip Portless and use ordinary ports:

```sh
bun run dev:ports
```

The app is then http://localhost:5173, API http://127.0.0.1:3001, and email templates http://localhost:3002. Keep the app's `localhost` origin when testing login; mixing hostnames changes cookie scope. Each process can also run independently through `dev:web`, `dev:api`, and `dev:emails`; prefix a command with `PORTLESS=0` to bypass the proxy.

## Create a local account

1. Open the app and choose **Sign in**.
2. Enter any test email such as `player@example.com` and request a link.
3. Open **Local inbox**, select the message, then choose **Open sign-in link**.
4. You are signed in to a real Better Auth account. Users and sessions persist across restarts.

The email is rendered with React Email and stored only in `.data/mail/` with private filesystem permissions. It is not delivered externally. The React Email viewer watches `apps/api/emails/` for template changes; the inbox displays emails the app actually generated. These are separate tools. Local inbox API routes are absent in production.

## Steam and match data

In **Your account**, save a Dota friend ID or SteamID64, preferred role, and experience level. SteamID64 values are normalized to Dota account IDs. Preferences persist in PostgreSQL for your signed-in user. **My matches** opens that profile, and Match explorer uses it by default when no different player is selected.

A manually saved profile selects public match history and does not establish Steam ownership. When Steam is connected and no manual profile is saved, Tito uses the verified Steam account as the default. Connecting Steam does not unlock private match data.

Database settings and optional integration credentials go in `apps/api/.env`. Keep that file private; deploy through your host's environment variables.

Open a recent match to see team scores, game mode, lobby, region when known, public player names, hero portraits, level, K/D/A, last hits/denies, net worth, GPM/XPM, damage, healing, and final inventories. Inventory includes backpack, neutral item, and neutral enhancement. Expand **Item names** for a text version. The player column stays visible while the scoreboard scrolls horizontally, including with keyboard focus.

The saved profile identifies **Your player**; a public search identifies **Selected player** without claiming account ownership. SteamID64 searches carry their canonical Dota account ID into match links and back navigation. Gold and XP advantage graphs support mouse exploration, keyboard/touch sliders, and expandable numeric data. Positive values favor Radiant, negative values favor Dire. Missing samples remain gaps; unparsed matches explain unavailable replay timelines. Empty inventory slots, missing slot data, and unknown item IDs are displayed separately. Hero/item names and images use OpenDota constants and Steam's CDN, with a 24-hour metadata cache and readable fallbacks if a catalog or image fails. Match responses retain the existing 60-second cache. No new key or database migration is required for these views.

- **Steam:** set `STEAM_API_KEY` to enable Steam sign-in and authenticated Steam linking. Tito uses Better Auth with the community `better-auth-steam` OpenID 2.0 plugin. Steam does not supply an email; the plugin uses an internal unverified `@steam.invalid` placeholder. No real email is inferred from it. Review the plugin when upgrading authentication dependencies.
- **OpenDota:** enter a Dota friend ID or SteamID64 in Match explorer. Responses are validated, cached for 60 seconds, and normalized for display. Available history and replay statistics depend on OpenDota and public match data; signing in to Steam does not grant private match history. The optional `OPENDOTA_API_KEY` stays on the API server.
- **Resend:** select `EMAIL_TRANSPORT=resend` and configure `RESEND_API_KEY` and `EMAIL_FROM` with your verified sending domain. The same React Email template is used. Delivery failures propagate instead of reporting success.

`patches/better-auth-steam@0.2.3.patch` adapts the Steam plugin to Better Auth 1.7's state and account lookup APIs. Bun applies it automatically through `patchedDependencies`; include the `patches/` directory with `package.json` and `bun.lock` in deployment sources. Keep these authentication versions together until an upstream plugin release supports the new APIs, then review and remove the patch. `apps/api/src/steam-auth.test.ts` exercises sign-in, repeat sign-in, email-account linking, ownership conflicts, cancellation, and callback state validation with simulated Steam responses. After changing this patch, restart the API and begin a fresh Steam login; callbacks from older attempts have incompatible state.

No external email is sent by default. Steam's complete round trip and Resend delivery require real credentials; automated checks exercise local authentication and a simulated provider failure.

## Hero picker

Open **Tools → Hero picker** (`/tools/hero-picker`) during a draft. Select your role, choose the destination group, and add allied picks, enemy picks, bans or optional favorites for this draft using searchable portraits. Favorites never limit the general choices. The tool builds a deterministic shortlist of up to sixteen available heroes using approximate catalog role tags and optional saved experience, then adds up to four other favorites. Saved Favorite entries for the selected role join automatically. Saved Avoid entries are excluded unless explicitly added as a favorite for this draft; picked and banned heroes are always excluded. Comfortable and Learning entries do not count as favorites. These are bounded shortlist assessments, not an exhaustive ranking of every hero.

The portrait catalog is a bundled, normalized 127-hero OpenDota snapshot with its retrieval date. Preparing a draft does not depend on OpenDota uptime or an AI key. Input is saved on this browser for four hours, separately for each Tito/Steam identity; choose **New draft** each game. Browser storage failures leave the current input usable. Current-draft recommendations are not saved in browser storage.

Choose **Suggest heroes** for the three best assessed draft fits, potential advantages and tradeoffs, plus up to two other favorite alternatives. Favorites among the main recommendations receive a badge rather than a duplicate card. A signed-in account and server `OPENAI_API_KEY` are required; Steam is optional. **Use my saved hero experience** considers counts from your verified Steam account's retained summaries, with no other player lookup. Counts measure recorded experience, not skill. Only hero identities/catalog traits, preferences, optional counts and requested aggregate matchup samples are sent; names, account IDs and match logs are excluded.

One batched [Decisions API](https://developers.openai.com/api/docs/guides/decisions) request uses `gpt-6-luna`; there is no second writing call. Fit is not a win probability. Optional aggregate matchup evidence checks cached OpenDota samples for up to three revealed enemies; rank and patch cohorts are unspecified. Current-patch ability data remains unverified. The optional local game connection imports exposed draft data only after you request it. Eight-second request timeout, bounded input/output and shared estimated AI spending ceilings protect work. Thirty paid draft attempts/user/UTC day have a separate counter from match reviews; unchanged context reuses a fifteen-minute server cache. Failed/expired/edited results are explicitly marked outdated; New draft discards pending results. See [hero-picker costs](deployment.md#hero-picker-decisions) for implementation and activation limits.

AI features are optional. Controlled tests and browser fixtures cover the flow; verify live latency, availability and suggestion quality with your own provider configuration before a hosted release.

## Connected companion tools

The Tools page focuses on four essentials: Hero picker, Hero pools, Compare matches and Hero reference. Coaching, personal heroes and session reflection are linked from Progress; the notebook is linked from Matches. Usage, installation and local game setup are under Account. Draft history is linked from the picker, and patch notes from Hero reference. Review feedback appears on match pages. The separate Replay evidence panel has been removed to keep the page focused on the scoreboard, timelines and match review. Detailed purchase and minute-sample comparisons remain under Compare matches. Use **Request replay analysis** when replay timelines are missing; recent replays can take time to appear, and older unparsed replays may have expired. Saved notes remain accessible from the match notebook; the note editor and review follow-up form are no longer shown on match pages. AI generation remains explicit and works after you configure the deferred key; saved history and public references need no model key.

See the [companion guide](companion.md) for every feature, storage limits, local game setup, privacy and verification limits.

## AI match reviews

Open a match and choose **Review this match** for **What went well**, **What went wrong**, and **How to improve**. The review follows the verified connected Steam player, independently of the manually selected public profile or scoreboard row. If public identities are hidden, an owned saved summary can establish the player; sync history first. A match that cannot be verified as yours cannot use AI budget.

Each observation/action cites server-built statistics. Direct observations are distinguished from questions to check in the replay; the app does not claim totals explain individual decisions. Personal averages use up to 20 earlier same-hero saved games within ±25% duration, with at least five available values per metric. Zero stays zero; unavailable fields are omitted. These comparisons are not normalized for rank, role, patch or game mode. Positives or concerns may be empty when unsupported.

Reviews are generated only on request, saved in PostgreSQL, and readable without OpenDota or OpenAI calls. **Check for updates** rebuilds the context, reusing an unchanged input/model/prompt fingerprint without another AI call. Failed updates preserve successful reviews. Default retention is 100 reviews per user, separate from saved match summaries; account switching hides old reviews and clears them after a successful new-account generation. User deletion cascades review records.

Add `OPENAI_API_KEY` to `apps/api/.env` and restart the API when ready. Without it the app shows an unavailable state and makes no AI requests; saved reviews remain readable. The integration uses the Responses API, strict structured output, `store:false`, no tools or automatic retries, a 30-second timeout, 16 KiB request input, and at most 1,800 output tokens. Only selected statistics, hero label and personal averages are sent; names, account IDs, email and chat are excluded. `store:false` does not by itself opt out of provider abuse monitoring; review [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data) before production use.

Defaults are $0.50/day and $5/month **estimated** spend, five paid attempts per user per UTC day, a 60-second user cooldown and a fenced database lease. Errors with uncertain usage retain the full reservation. These controls work across API replicas but are not a guaranteed provider billing cap. See [AI costs and configuration](deployment.md#ai-review-cost-controls) for rates, limits and validation status. The user has deferred the key: controlled end-to-end tests pass, but live model quality and actual billed usage still need verification.

## API key setup

Set secrets in `apps/api/.env` locally and in your host's secret variables when deployed. Restart the API after changing keys. They belong on the server; do not put them in frontend `VITE_` variables or paste them into chat.

| Variable           | When needed                                                                                                      | Where to get it                                                                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `STEAM_API_KEY`    | Enable Steam sign-in and account linking. Manual Dota profile selection works without it.                        | [Steam key registration](https://steamcommunity.com/dev/apikey), [official instructions](https://partner.steamgames.com/doc/webapi_overview/auth) |
| `OPENDOTA_API_KEY` | Optional if your usage needs keyed access. Public match lookup already works without one within provider limits. | [OpenDota API keys](https://www.opendota.com/api-keys)                                                                                            |
| `OPENAI_API_KEY`   | Enable AI match reviews and hero suggestions; draft preparation needs no key.                                    | [OpenAI API keys](https://platform.openai.com/api-keys), [official quickstart](https://developers.openai.com/api/docs/quickstart)                 |
| `RESEND_API_KEY`   | Real email delivery when `EMAIL_TRANSPORT=resend`. Local inbox needs no key.                                     | [Resend API keys](https://resend.com/api-keys), [official instructions](https://resend.com/docs/dashboard/api-keys/introduction)                  |

For Steam, sign in to the registration page, register a **user Web API key** for the app's domain, review Steam's terms, and copy the resulting value into `STEAM_API_KEY`. This is separate from Steamworks publisher access.

For OpenAI, create/select a project in the API dashboard and create a project API key. Store it as `OPENAI_API_KEY` in the API environment and restart the API. [OpenAI's key guidance](https://developers.openai.com/api/docs/guides/api-keys) explains development keys and service accounts for deployed applications. No key is required until you enable reviews; adding one permits explicit match-review and hero-picker requests to call OpenAI.

For Resend, create a sending API key, [verify a domain you own](https://resend.com/docs/dashboard/domains/introduction), then set `RESEND_API_KEY`, `EMAIL_TRANSPORT=resend`, and `EMAIL_FROM` to an address on that domain. Keep `EMAIL_TRANSPORT=local` for the local inbox.

## Replay analysis

Steam linking identifies the player; it does not cause OpenDota to parse every replay. When timelines are missing, signed-in players can choose **Request replay analysis** on a match. Tito submits the public match ID, shows queue progress, and checks every 10 seconds for up to five minutes. Once the provider job disappears, Tito bypasses its cached match response and verifies that both gold and XP data are present before reporting completion. A pending job is not proof that parsing will succeed: expired/unavailable replays and partial data remain explicitly unavailable, with options to check again or open OpenDota.

Submission requires a session and the configured web origin. Requests are explicit, duplicate submissions for a match are shared for ten minutes, and per-user submission cooldowns protect API quota. Status checks are cached for five seconds and throttled per user/job; temporary rate limits get bounded retry/backoff. API keys stay server-side. The duplicate/cooldown maps are process-local, so multiple API instances would need shared storage for cross-instance deduplication. A restart may require requesting/checking again. No extra key or schema migration is required.

Automated checks cover the action, queued state, polling and match-query refresh. Older matches depend on replay availability on Valve/OpenDota.

## Stack

| Area           | Tools                                                                                |
| -------------- | ------------------------------------------------------------------------------------ |
| Tooling        | TypeScript, Bun, Crew, Portless                                                      |
| Frontend       | React, Vite, React Router, Tailwind CSS, shadcn/ui with Base UI                      |
| Server state   | TanStack Query, Orval-generated hooks                                                |
| API            | Hono, Zod, OpenAPI                                                                   |
| Authentication | Better Auth; optional Steam OpenID plugin; email magic links                         |
| Persistence    | Drizzle + PostgreSQL/postgres.js in development and production; PGlite only in tests |
| Email          | React Email templates and viewer; local outbox; optional Resend                      |
| Verification   | Vitest, TypeScript, production builds                                                |

Component and page styling lives alongside the JSX as Tailwind utilities. Repeated control styling belongs in `components/ui` primitives and their variants. Keep `styles.css` for theme tokens, base element defaults, and global accessibility/browser fallbacks; add component-specific rules in the owning component.

## Commands

```sh
bun run check          # Typecheck, tests, builds, formatting
bun run generate:api   # Export route-owned OpenAPI; regenerate Orval hooks
bun run db:generate    # Generate a migration after schema changes
bun run db:migrate     # Create the database if permitted; apply committed migrations
bun run db:studio      # Open Drizzle's visual database browser
bun run test:postgres  # Real PostgreSQL lifecycle and production-start checks
bun run format
```

After changing Better Auth plugins or user fields, update `apps/api/auth.config.ts` to match the runtime config, regenerate the auth schema, inspect it, then generate and review SQL:

```sh
cd apps/api
bun run auth generate --config ./auth.config.ts --output ./src/db/schema.ts --yes
bun run db:generate
```

`apps/web/src/api/generated/` and `apps/api/src/db/schema.ts` are generated. Change their source contracts/configuration rather than hand-editing them. Runtime auth options live in `apps/api/src/auth.ts`; the schema-only configuration never connects to a database or sends email.

## Database lifecycle

`DATABASE_URL` is required for the app in every environment. Tito does not silently select PGlite when it is missing. PGlite remains a test-only dependency; earlier `.data/postgres` files are left intact but are no longer used by the app. Embedded accounts are not copied into PostgreSQL; sign in again to create your PostgreSQL account.

`db:generate` compares the TypeScript schema with migration snapshots and writes SQL files. It deliberately does not connect to a database. Review and commit these files before deployment; do not generate migrations during deployment.

`db:migrate` connects to the database named in `DATABASE_URL`. If it does not exist, setup connects to the same server's `postgres` maintenance database and creates it using the configured role, then applies committed migrations. Names are quoted as SQL identifiers. Existing databases and records are preserved. Repeating setup is safe; concurrent migrations are serialized with a PostgreSQL advisory lock.

Creating a database requires PostgreSQL `CREATEDB` permission. If your managed provider restricts this, provision the database through the provider first and set `DATABASE_URL` to its connection string. Once the database exists, the migration role needs permission to create/alter application tables and the `drizzle` migration schema. Setup reports an actionable error and exits nonzero when permissions or connectivity are missing.

Use a direct PostgreSQL connection rather than transaction pooling for setup/startup: migration serialization holds a session lock. PostgreSQL itself must already be running; these commands create the logical database, not the server.

`bun run test:postgres` builds the API, loads its database settings, and creates unique disposable `tito_test_…` databases on that development server. It checks first-run creation, concurrent/repeated migrations, data preservation, successful production startup, and failed-start behavior. It removes only the databases it creates and never resets `tito`. Ordinary `bun run test` skips these checks unless `TEST_DATABASE_URL` is supplied.

## Production startup

Provision PostgreSQL through your host, set `DATABASE_URL`, a private `BETTER_AUTH_SECRET`, a public HTTPS `WEB_URL`, and explicit Resend credentials/from address. Production startup rejects local mail and the development secret.

```sh
bun install --frozen-lockfile
bun run build
bun run start
```

`bun run start` runs database setup/migrations first, then launches the built API in production mode. If database setup fails, the server does not start. Configure this as your API hosting service's start command. Required production variables are `DATABASE_URL`, `BETTER_AUTH_SECRET`, `WEB_URL`, `EMAIL_TRANSPORT=resend`, `RESEND_API_KEY`, and `EMAIL_FROM`; the host can assign `PORT`.

Serve the built frontend and proxy `/api/*` to the API under the **same public origin**, matching `WEB_URL`. This is required for same-origin authentication and generated API requests. The API build keeps npm packages external, so deploy the workspace source, runtime dependencies, built output, and committed `apps/api/drizzle/` migrations. Use the start command above; launching the server directly bypasses migration setup.

Local development files and `.data/` are ignored. Do not publish the local inbox, React Email viewer, or development servers. This repository contains the foundation, not a deployed production service.

## Languages

Tito supports English (default) and Latin American Spanish. Use the EN/ES control in the toolbar, or **Account → App settings → Language**. The explicit choice is stored on this browser as `tito:locale`, shared across tabs, and works when browser storage is blocked for the current tab. Changing language updates the current screen, accessible labels, dates and numbers without resetting drafts, notes or unsaved form input. It does not sync the preference across devices.

Catalogs live in `apps/web/src/i18n`; English and Spanish have the same typed keys and interpolation signatures. Subscribe translated React components with `useLocale`, and resolve copy/formatters during rendering rather than capturing localized values at module scope. Known API presentation messages are translated at display time; arbitrary user, provider and AI prose is preserved. Hero/item proper names, mode names used by Dota, and external patch notes retain their source spelling. The standalone offline reference supports the same preference.

Requests carry the active `Accept-Language`. New sign-in emails and explicitly generated match reviews/coaching use that language. Generation cache fingerprints include language. Existing reviews stay in their authored language, shown beside the saved text; legacy results without locale metadata are treated as English. Switching the interface does not generate or translate a review automatically. No new API key or database migration is required for language support. Live AI quality remains unverified until a key is configured.

Document language, route titles and client-side descriptions follow the selection. The shared static HTML and OG image remain English; this change does not add locale-specific public URLs or social-preview images.

Routine **Sync new matches** uses the latest 20 summaries when they overlap your retained history. It bypasses Tito's recent-read cache and keeps existing richer statistics when OpenDota omits a field. First imports, explicit older pages and non-overlapping gaps use a bounded 100-match archive page. Archive calls allow up to 20 seconds rather than failing at the normal 10-second deadline; saved matches remain browsable while waiting. A failed fast request is not automatically retried through the heavier endpoint. Summary hero labels/images use the bundled catalog or already-cached live metadata, so a separate catalog lookup cannot delay a sync. Successful 100-row views update directly from the sync response, while larger loaded windows refresh from Tito's database.
