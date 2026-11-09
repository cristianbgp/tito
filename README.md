# Tito

A Dota 2 companion for understanding your matches and choosing what to improve. Explore match history, compare games, track personal trends, and request evidence-based AI reviews or draft suggestions.

Tito is experimental, open source, and available in **English and Latin American Spanish**, with light and dark glass themes. It is an independent project, not affiliated with or endorsed by Valve or OpenDota.

## What it does

- Connect Steam or explore a public Dota profile.
- Import and retain compact match summaries in PostgreSQL, with filters for heroes, results, queue and game mode.
- Explore scoreboards, item identities, and coordinated gold/XP timelines when replay data is available.
- Track hero performance and personal progress, compare matches, and manage hero pools.
- Request AI match reviews, coaching, or hero-picker suggestions explicitly. These features need a server-side OpenAI key.
- Preview sign-in emails and use a local inbox without Resend or external email delivery.

Missing data stays unavailable. Match totals and aggregate hero statistics do not establish what caused a win or loss. AI suggestions are learning aids, not guarantees.

## Run locally

Install **Bun 1.4.4 or later**, **Node.js 24 or later**, and start a PostgreSQL server. The checked-in Bun lockfile and Steam authentication patch are required. Local email sign-in and public references need no paid API keys.

From the repository root:

```sh
bun install --frozen-lockfile
cp apps/api/.env.example apps/api/.env
```

Edit `DATABASE_URL` in `apps/api/.env` for your PostgreSQL server and credentials, then run:

```sh
bun run db:migrate
bun run dev:ports
```

Open [http://localhost:5173](http://localhost:5173). Crew starts the web app, API, and React Email viewer together. The API checks database setup and applies committed migrations before serving requests. Ctrl+Q stops Crew.

`db:migrate` creates the named application database when the database role has `CREATEDB` permission. If your provider does not allow that, provision the database first. The command does not install or start PostgreSQL. `db:generate` generates migration files only.

### Local sign-in

1. Choose **Sign in** and enter a test address such as `player@example.com`.
2. Open **Local inbox**, select the message, and follow its sign-in link.
3. Connect Steam if you want to import your own matches or request personal AI reviews.

| Service         | Ordinary ports                   | Portless                              |
| --------------- | -------------------------------- | ------------------------------------- |
| App             | http://localhost:5173            | https://tito.localhost                |
| API health      | http://127.0.0.1:3001/api/health | https://api.tito.localhost/api/health |
| Email templates | http://localhost:3002            | https://emails.tito.localhost         |
| Local inbox     | http://localhost:5173/dev/inbox  | https://tito.localhost/dev/inbox      |

### Named local HTTPS with Portless

Complete Portless's certificate/proxy setup in an interactive terminal:

```sh
bunx portless proxy start
bun run dev
```

`.env.portless` contains public local origins only; credentials belong in the ignored `apps/api/.env`. Use one app origin consistently when testing login because cookies follow the hostname. Individual services are available through `dev:web`, `dev:api`, and `dev:emails`; prefix with `PORTLESS=0` for ordinary ports.

## Optional provider keys

| Variable           | Purpose                                                                         | Where to get it                                             |
| ------------------ | ------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `STEAM_API_KEY`    | Steam sign-in and account linking                                               | [Steam registration](https://steamcommunity.com/dev/apikey) |
| `OPENDOTA_API_KEY` | Optional authenticated OpenDota requests; public access works within its limits | [OpenDota](https://www.opendota.com/api-keys)               |
| `OPENAI_API_KEY`   | On-demand reviews, coaching and hero suggestions                                | [OpenAI project keys](https://platform.openai.com/api-keys) |
| `RESEND_API_KEY`   | External email when `EMAIL_TRANSPORT=resend`; unnecessary for the local inbox   | [Resend](https://resend.com/api-keys)                       |

Keep all keys on the API server. Never put them in frontend `VITE_*` variables, screenshots, issues, or commits. Restart the API after changing configuration. Provider availability, quotas and billing remain separate from Tito's estimated spending controls. See the [feature guide](docs/features.md#api-key-setup) for configuration details.

## Development

| Area          | Stack                                                                   |
| ------------- | ----------------------------------------------------------------------- |
| Web           | React, Vite, React Router, TanStack Query, Tailwind CSS, shadcn/Base UI |
| API           | Bun, Hono, Zod/OpenAPI, generated Orval client                          |
| Auth and data | Better Auth, PostgreSQL, Drizzle; PGlite for tests only                 |
| Local tooling | Crew, Portless, React Email; local mail or optional Resend              |

```sh
bun run check          # Type checks, tests, builds, formatting
bun run test:postgres  # Three lifecycle checks against disposable databases
bun run generate:api   # Regenerate OpenAPI and frontend client
bun run db:generate    # Generate migrations after schema changes
bun run db:studio     # Local database browser
bun run format
```

The regular test suite needs no provider keys or running PostgreSQL server. It skips the three real PostgreSQL lifecycle tests unless configured. `test:postgres` uses your development database server and creates/removes only unique `tito_test_*` databases; its role needs `CREATEDB` permission.

The main CI workflow runs checks/builds for pull requests and pushes to `main`. A separate PostgreSQL workflow runs only for backend, shared-code, dependency, or database-workflow changes, and can also be started manually. Both use no provider secrets; hosted verification begins after the repository is pushed.

## Deployment

The supported layout is a Bun API with PostgreSQL and a frontend that proxies `/api/*` to it under the same public origin. Production requires HTTPS, a private authentication secret, and configured email delivery. Startup applies committed migrations before accepting requests.

See [deployment and cost controls](docs/deployment.md) for Railway, Cloudflare Pages, environment variables, retention and request budgets. Set `PUBLIC_SITE_URL` when building the web app so canonical and social-preview URLs use your domain. This repository does not provision or publish infrastructure.

## Documentation

- [Feature and implementation guide](docs/features.md)
- [Connected tools, storage and privacy](docs/companion.md)
- [Deployment and cost controls](docs/deployment.md)
- [Brand assets](docs/brand.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md) and [known dependency notes](docs/security-notes.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)

## License

Tito's original code is licensed under [MIT](LICENSE). Third-party dependencies, bundled data and Valve names/artwork retain their own rights and notices. See [third-party notices](THIRD_PARTY_NOTICES.md).
