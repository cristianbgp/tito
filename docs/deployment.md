# Deployment and cost controls

The prepared layout is one Bun API, one PostgreSQL database, and a Cloudflare Pages frontend. No resources have been provisioned or deployed by this change. A $10–20 monthly hosting budget is a planning target, not a guaranteed bill; model usage, paid data API usage, email and domains are separate.

## Application limits included

| Control                                  | Default                                                       | Configuration                             |
| ---------------------------------------- | ------------------------------------------------------------- | ----------------------------------------- |
| Initial import / older page              | At most 100 summaries                                         | Fixed                                     |
| Retention per connected player           | Newest 1,000 imported summaries                               | `HISTORY_MAX_MATCHES`, 100–1,000          |
| Sync cooldown, including failed attempts | 60 seconds                                                    | `HISTORY_SYNC_COOLDOWN_SECONDS`, 30–3,600 |
| Sync lease                               | 45 seconds                                                    | Fixed, database-fenced                    |
| Actual OpenDota calls                    | 1,000 per UTC day                                             | `OPENDOTA_DAILY_REQUEST_LIMIT`, 1–100,000 |
| Temporary upstream cache                 | 200 entries, 16 MiB of serialized data total, 2 MiB per entry | Fixed                                     |
| Active provider requests per API process | 20                                                            | Fixed                                     |

The cache size is a serialized-data budget, not an exact JavaScript heap/RAM limit. Catalogs expire after 24 hours; detailed match responses normally expire after one minute. Expired entries are pruned on access and identical concurrent GETs share work. Large entries are not cached. The daily request reservation is shared in PostgreSQL, happens before an upstream request, and conservatively counts errors. Cache hits do not consume it. At exhaustion, provider calls return 429 with a clear message; saved history reads still work.

Only a verified linked Steam account can import history. Public player lookup does not create archive rows. The initial sync is explicit, as are later syncs and older imports; there is no scheduled polling or background replay parsing. Saved previews use stored summaries; opening match details may call the provider. Limits are per account except the shared daily provider ceiling. They cap work/requests, not dollars, and do not replace infrastructure/provider billing controls.

Data lives in `player_sync` and `player_match`. Summaries include IDs, time/duration, result, hero ID/name/image URL and numeric K/D/A/GPM/XPM. Image bytes, replay files and raw detail JSON are not persisted. Numeric metadata lives inline with each owned summary to keep queries simple and avoid shared orphan rows. Retention and account replacement delete old owned rows; deleting the owning user cascades. Lowering the configured retention applies on the next successful sync. The primary key `(user_id, match_id)` handles deduplication and newest-first reads. Unknown fields stay null; incomplete updates preserve previously known statistics.

OpenDota's documented player-history endpoint uses limit/offset and projected fields. Older requests overlap ten source positions; latest refreshes adjust or reset progress when the source changes. This is an imported sample, not a promise of complete lifetime coverage or private data access. Newly discovered recent gaps can be filled within the retention window. [OpenDota API contract](https://api.opendota.com/api)

## Railway API and PostgreSQL

Use the repository root as the Railway API root. `railway.toml` builds only the API, starts through the existing migration-aware production command, sets `/api/health`, and requests one replica with bounded failure restarts. Keep PostgreSQL in the same region, using a private direct `DATABASE_URL` for migrations and runtime. The migration runner requires a direct connection for its advisory lock; avoid a transaction-pooling URL. Production requires these server-side variables:

```dotenv
NODE_ENV=production
WEB_URL=https://your-app.example.com
DATABASE_URL=postgres://<provider-provisioned-private-connection>
BETTER_AUTH_SECRET=<private-random-value-at-least-32-characters>
EMAIL_TRANSPORT=resend
RESEND_API_KEY=<server-side-key>
EMAIL_FROM=Tito <coach@your-verified-domain.example>
STEAM_API_KEY=<server-side-key-if-steam-is-enabled>
OPENDOTA_DAILY_REQUEST_LIMIT=1000
HISTORY_MAX_MATCHES=1000
HISTORY_SYNC_COOLDOWN_SECONDS=60
```

`OPENDOTA_API_KEY` remains optional and server-side. Use a read/write application role and provision the database through the host; no `CREATEDB` grant is necessary when the database exists. Review backups and their retention before accepting real user data. Limit preview environments so idle database copies do not accumulate.

In the actual Railway workspace, configure a monthly soft usage alert below the budget (for example $10 and $15 for a $20 target), and inspect both API and PostgreSQL CPU/RAM/volume usage. If choosing a hard usage limit, understand that reaching it can shut services down. This is an owner billing decision and is not set by `railway.toml`. Replica CPU/RAM limits also live in the service settings; start with modest limits after measuring the deployed process, then adjust from metrics rather than enabling unrestricted replicas. Avoid treating a plan's included usage as a flat total price. [Cost controls](https://docs.railway.com/pricing/cost-control), [config reference](https://docs.railway.com/config-as-code/reference), [pricing](https://railway.com/pricing).

No account-level alerts, hard stops, replicas' resource limits, backup policy or paid API billing limits are claimed enabled until configured in your real hosting/provider workspace. The repository does not contain billing credentials or a linked project ID.

## Cloudflare Pages

Set project root `apps/web`, build command `bun run build`, and output directory `dist`. Ensure the build installs from the repository's Bun workspace/lockfile. Set the Pages runtime variable `API_ORIGIN=https://<your-railway-api-origin>` to a plain HTTPS origin with no path, credentials or query. `WEB_URL` on the API must match the public Pages/custom-domain origin users actually visit.

`functions/api/[[path]].ts` proxies only `/api/*` to that fixed origin. It preserves request method/body, Cookie and Origin, leaves auth redirects for the browser, and forwards Set-Cookie responses with `private, no-store`. Thus Better Auth and Steam callbacks remain on the frontend origin, following the same-origin arrangement used locally. Never place API secrets in Vite variables. Configure preview deployments separately; arbitrary preview origins are deliberately not trusted by the production API.

`public/_routes.json` limits Functions invocation to API paths. Static assets use Pages hosting, while API proxy traffic consumes the Pages Functions/Workers quota. Monitor that quota too. The frontend has no `404.html`, so Pages supplies SPA navigation fallback. Existing local Vite proxy behavior remains unchanged. [Functions routing](https://developers.cloudflare.com/pages/functions/routing/), [pricing](https://developers.cloudflare.com/pages/functions/pricing/), [SPA serving](https://developers.cloudflare.com/pages/configuration/serving-pages/).

The proxy has local request/response tests. Cloud deployment, real Steam/email redirects through Cloudflare and platform resource sizing still need staging verification before a production launch.

## Measure before increasing capacity

In the database's SQL console:

```sql
select count(*) as saved_summaries from player_match;
select count(*) as synced_accounts from player_sync;
select pg_size_pretty(pg_total_relation_size('player_match')) as summaries_with_indexes;
select pg_size_pretty(pg_database_size(current_database())) as database_total;
select key, period, used from provider_budget;
```

Watch provider usage, sync failures and API latency alongside CPU, memory, database size, backups and egress. Application logs intentionally avoid request URLs because auth callbacks and paid provider keys can contain secrets. Shared leases and provider counters support more replicas later, but existing replay submission throttles remain process-local; move those to shared storage before enabling multiple replicas. No Redis/search cluster/queue is needed for this first version.

## AI review cost controls

AI reviews are optional: set server-only `OPENAI_API_KEY` to enable explicit POST generation. GET saved reviews never contacts providers. Without the key, POST returns 503 before any provider/budget work; no synthetic result is used in the real app. Apply the committed `0003` migration before serving this version; normal startup already migrates.

| Variable                         | Default                   | Bounds / meaning                                                          |
| -------------------------------- | ------------------------- | ------------------------------------------------------------------------- |
| `OPENAI_REVIEW_MODEL`            | `gpt-5.4-mini-2026-03-17` | Only this pinned Mini model or `gpt-5.6-terra`; unpriced IDs fail startup |
| `AI_REVIEW_DAILY_BUDGET_CENTS`   | 50                        | 0–10,000 USD cents per UTC day                                            |
| `AI_REVIEW_MONTHLY_BUDGET_CENTS` | 500                       | 0–100,000 USD cents per UTC month                                         |
| `AI_REVIEW_USER_DAILY_LIMIT`     | 5                         | 1–20 paid attempts per user per UTC day, including failures               |
| `AI_REVIEW_RETENTION`            | 100                       | Latest 25–200 reviews per user                                            |

A 60-second per-user cooldown and 90-second fenced lease coordinate all matches and API instances. Lease checks after preparation and reservation prevent stale workers from starting paid work; the final write is also fenced. Trusted Origin, session Steam ownership and strict request validation precede generation. Inputs exclude player/account identities and arbitrary prose; server-issued evidence references are validated before saving.

The Responses request uses `store:false`, strict JSON schema, reasoning effort `none`, no tools, no retries, 30-second timeout and 1,800 maximum output tokens. The entire serialized request input/schema/instructions is bounded to 16 KiB; reservation uses its UTF-8 byte count plus 2,048 framing tokens, full output allowance, a 1.25× input margin and 10% regional margin. Current code's rates were verified November 7, 2026: Mini $0.75 input / $4.50 output per million tokens; Terra $2 / $12. See [Mini model/pricing](https://developers.openai.com/api/docs/models/gpt-5.4-mini), [Terra model/pricing](https://developers.openai.com/api/docs/models/gpt-5.6-terra), [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs). Recheck these rates and supported options before enabling live use, and update the allowlist/rates together.

Before each AI request, one transaction reserves integer micro-USD against shared month/day/user counters and records an attempt. Periods only move forward, so delayed old requests cannot reset new quotas. Known successful usage settles exactly once; unavailable/ambiguous usage, refusals, invalid outputs and timeouts conservatively keep the full reservation. If a fenced request is rejected before calling the model, its spend is refunded but its attempt still counts. Counters never refund a later UTC period. A process crash leaves the reservation consumed, and an expired lease permits a later explicit attempt. Attempt records older than 35 days are pruned on generation; fixed global counters persist. User deletion cascades private records/user counters but does not reset global spend.

These are conservative application estimates, **not a guaranteed OpenAI invoice ceiling**: provider pricing, other applications using the project, and account settings can affect the bill. Use a dedicated provider project, inspect usage and configure available prepaid/billing controls separately; no provider billing controls have been changed here. Setting either estimated budget to zero prevents new paid calls while keeping saved reads usable. Monitor `review_budget` (`used_micros / 1000000.0` gives estimated USD), pending attempts, refusals, latency and the gap from provider usage. No queue or extra service is required.

Live AI calls remain unverified because the user will add the key later. Controlled Responses/route/browser fixtures, budget/lease regressions and real PostgreSQL tests cover the implementation. Before production activation, check a small set of representative real matches for useful evidence-grounded advice, actual usage, missing replay data and provider refusals; AI text remains an interpretation rather than proof of in-game causes.

## Hero picker Decisions

The hero picker uses the same server-only `OPENAI_API_KEY` with a fixed `gpt-6-luna` Decisions model. The catalog endpoint is public and bundled; suggestion POST requires a session and trusted Origin. No Steam connection is required for generic suggestions; verified saved history is the only source of personal hero counts. Optional aggregate matchup evidence can make up to three cached OpenDota lookups; the bundled catalog and saved favorites need no provider request.

`AI_DRAFT_USER_DAILY_LIMIT=30` accepts 1–100 paid attempts/user/UTC day. It has a separate per-user budget key (`user:draft:<userId>`), two-second cooldown and twenty-second fenced lease. Both tools reserve against the **same** global daily/monthly micro-USD counters and configured `AI_REVIEW_*_BUDGET_CENTS` ceilings; the historical variable names now cover combined AI spend. Review per-user limits keep their existing behavior. `review_attempt.user_budget_key` records the refund destination, falling back to the original review key for older records.

One latest result/control row in `hero_draft` per user keeps storage bounded and cascades on user deletion. Cache fingerprints include canonical draft input, context, verified account, model, prompt and catalog version. Equivalent reordered input is reused for fifteen minutes; a cache recheck after acquiring the lease prevents stale initial reads from starting duplicate paid work. Expired workers cannot replace new results. Browser input contains hero IDs/role/settings, including current-draft favorites or exposed local game picks. Saved Favorite/Avoid preferences are read server-side for the authenticated user and selected role; effective candidate or favorite changes invalidate cached suggestions. Browser input is scoped by Tito/Steam identity, expires after four hours, and does not persist AI results in browser storage.

Up to sixteen general candidates plus four additional available favorites each receive an independent five-level score and two category choices, all in one batch (twenty heroes, sixty questions maximum). Favorites are soft preferences, not evidence of skill or a reason to inflate fit. The response contains up to three overall recommendations and two nonduplicate favorite alternatives. Saved Avoid entries are excluded unless explicitly added as a current-draft favorite; picks and bans always apply. Prompt version `hero-picker-v3` invalidates older restricted-pool results. Optional favorite result fields preserve compatibility with older stored snapshots. Answers are validated for known names/options, uniqueness, complete questions, normalized probability distributions and consistent bounded scores. Refusals or partial/invalid responses fail without replacing prior successful server data. Text templates render fixed categories; the model cannot insert arbitrary prose or links. Request body is at most 48 KiB, response at most 128 KiB, timeout eight seconds, with no retry or extra explanation call. The frontend explicitly labels edited, failed and expired results and ignores a result from before New draft.

November 7, 2026 official [Decisions pricing](https://developers.openai.com/api/docs/guides/decisions#pricing-and-availability) is $0.10 per million uncached Luna input tokens, with output uncharged. [Luna pricing](https://developers.openai.com/api/docs/models/gpt-6-luna) lists $0.125/M cache writes, 10% regional premiums and 2× long-input rates. The reservation conservatively expands serialized shared input for all questions, adds question bytes and 2,048 framing tokens, and applies cache-write/regional/long-input margins; measured usage settles at these conservative rates. This is an application estimate, not a guarantee of the external bill. Missing/ambiguous usage retains the reservation. Recheck pricing/access and inspect real usage before activation; no provider billing settings were changed.

Migrations `0004` and `0005` add a nullable attempt scope column and the per-user draft table. Normal deployment startup applies committed migrations before readiness. Local PostgreSQL migration and isolated PostgreSQL budget/cache tests pass; no new infrastructure or runtime dependency is needed. The bundled catalog can lag game updates; refresh its normalized public snapshot deliberately and keep the displayed retrieval date accurate. No current patch or measured counter advantage is inferred from catalog retrieval time.

## Connected companion limits

See [the companion guide](companion.md) for all seventeen surfaces and local GSI/offline setup. Migration0006 adds bounded pools, annotations, draft snapshots, coaching state and nullable match context. Confirmed roles are user-owned metadata and cannot be inferred or overwritten by provider imports.

Coaching adds a separate ten-attempt/user/UTC-day counter while sharing review/draft global estimated budgets. Its cache retains at most twenty bounded results/user. Draft matchup evidence is opt-in: a cache miss reserves AI allowance inside the fenced user scope before up to three cached OpenDota requests. A stale lease before AI starts refunds its AI estimate while retaining the attempt and actual provider quota. No new worker, queue or paid infrastructure is introduced.

Local GSI is loopback-development-only with an expiring per-user token and bounded in-memory state; production does not register its receiver. The service worker caches public references/assets only and must never cache or proxy authenticated API responses. Preserve static worker/manifest/reference files before SPA fallback and keep the worker revalidatable. Live AI, real game payloads and OS installation still require their respective external checks.

## Frontend social metadata

Set `PUBLIC_SITE_URL=https://your-real-domain.example` in the frontend build environment. Use an origin only, without credentials, a subpath, query or fragment. Rebuild after changing it. This supplies absolute canonical and image URLs in the generated HTML; editing an API runtime variable does not change an existing frontend bundle. The variable is public and contains no credentials.

Cloudflare Pages preview builds can use their injected `CF_PAGES_URL` for reachable preview images and remain non-indexable. Other builds without either setting use a local development origin and warn, so set the real public origin before deploying a manually built bundle. The 1200×630 social PNG, favicon, Apple icon and manifest are static assets. Current share cards show generic Tito branding for all routes; per-match or private-account share cards are not generated.
