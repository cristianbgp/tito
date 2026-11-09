# Security policy

Tito is experimental. Security fixes target the current `main` branch; there are no supported release branches yet.

## Reporting a vulnerability

Use this repository's **Security → Advisories → Report a vulnerability** when private reporting is available. If it is unavailable, contact the repository maintainer through their GitHub profile to arrange a private channel before sending details. Do not put credentials, personal match data, working exploit payloads, or account information in a public issue.

Include the affected commit, a minimal reproduction with synthetic data, expected/actual behavior, and the potential impact. Reports about third-party libraries or services should also follow the upstream project's disclosure process.

## Credentials and private data

- API keys, database URLs, authentication secrets, and Resend credentials belong only in server environments.
- `.env` files, local mail, databases, development logs, and generated game connection files must not be committed.
- Use the local email inbox and synthetic data for development. Public CI needs no Steam, OpenAI, OpenDota, or Resend keys.
- Production must use HTTPS, a private authentication secret, and a correctly configured database and email provider. See [deployment](docs/deployment.md).

The MIT license is not a claim of security certification. See [known security notes](docs/security-notes.md) for dependency findings and verification limits.
