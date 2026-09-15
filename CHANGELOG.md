# Changelog

All notable changes to Sorobill will be documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added
- Initial project scaffold
- Subscription plans with daily / weekly / monthly / yearly intervals
- Recurring billing engine with BullMQ job queue
- Idempotent Stellar payment execution
- Grace period logic for failed payments
- Exponential backoff retry strategy (configurable)
- Webhook delivery system with HMAC-SHA256 signing
- Stellar keypair wallet verification
- Test / sandbox mode (no real transactions)
- REST API: `/plans`, `/subscriptions`, `/payments`, `/webhooks`, `/wallets`
- Fastify with helmet, CORS, and rate limiting
- Pino structured logging
- Prisma ORM with PostgreSQL
- Full documentation: README, ARCHITECTURE, API reference, CONTRIBUTING, SECURITY

## [1.1.0] - 2026-09-14

### Added
- Docker Compose (Postgres + Redis)
- Soroban `execute_billing` integration
- Merchant-scoped API routes and stats
- Readiness `/health` checks
- Pause / resume subscription endpoints
- HMAC webhook crypto helpers + unit tests
- GitHub Actions CI
