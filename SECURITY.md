# Security Policy

> **[← Back to README](README.md)**

## Supported Versions

| Version | Supported |
|---|---|
| `main` branch | ✅ |
| Older releases | ❌ |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Email **security@your-org.com** with:

1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested fix (optional)

We will acknowledge your report within 48 hours and aim to release a fix within 14 days for critical issues.

## Security Considerations for Self-Hosters

- **`STELLAR_TREASURY_SECRET_KEY`** — this key signs all billing transactions. Treat it like a root password. Use a dedicated keypair with only the funds needed for operations.
- **`WEBHOOK_SIGNING_SECRET`** — rotate this if compromised. All registered endpoints will need to update their verification logic.
- **Database** — ensure PostgreSQL is not publicly accessible. Use connection pooling (e.g., PgBouncer) in production.
- **Redis** — enable Redis AUTH and bind to localhost or a private network only.
- **HTTPS** — always terminate TLS at the load balancer in production. Never run the API on plain HTTP in production.
- **Rate limiting** — the default is 100 req/min. Tighten this for public-facing deployments.
