<div align="center">
  <h1>⚡ Substrata</h1>
  <p><strong>Stripe for recurring global payments — built on Stellar rails.</strong></p>
  <p>
    <a href="https://github.com/your-org/substrata-backend/blob/main/LICENSE">
      <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" />
    </a>
    <a href="https://nodejs.org">
      <img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen" alt="Node" />
    </a>
    <a href="docs/ARCHITECTURE.md">
      <img src="https://img.shields.io/badge/docs-architecture-orange" alt="Architecture" />
    </a>
  </p>
</div>

---

Substrata is an open-source subscription billing infrastructure that uses the [Stellar](https://stellar.org) blockchain as its payment rail. It gives developers a self-hosted, programmable alternative to Stripe Billing — with no intermediaries, global reach, and near-zero fees.

## Table of Contents

- [Why Substrata?](#why-substrata)
- [Features](#features)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [License](#license)

---

## Why Substrata?

Traditional payment processors are:
- **Geo-restricted** — Stripe isn't available in most of Africa, Southeast Asia, and Latin America.
- **Expensive** — 2.9% + $0.30 per transaction adds up fast.
- **Opaque** — you don't own the money movement.

Stellar solves all three. Substrata wraps Stellar's payment primitives into a familiar subscription billing API.

---

## Features

| Feature | Status |
|---|---|
| Subscription plans (daily / weekly / monthly / yearly) | ✅ |
| Recurring billing via BullMQ job queue | ✅ |
| Idempotent payment execution | ✅ |
| Grace period for failed payments | ✅ |
| Exponential backoff retry strategy | ✅ |
| Webhook delivery with HMAC signing | ✅ |
| Wallet verification (Stellar keypair auth) | ✅ |
| Test / sandbox mode | ✅ |
| Soroban smart contract support | 🔜 |
| Multi-asset billing (USDC, custom tokens) | ✅ |
| Dashboard UI | 🔜 |

---

## Quick Start

### Prerequisites

- Node.js ≥ 20
- PostgreSQL ≥ 14
- Redis ≥ 7
- A Stellar testnet account ([get one free](https://laboratory.stellar.org/#account-creator?network=test))

### 1. Clone & install

```bash
git clone https://github.com/your-org/substrata-backend.git
cd substrata-backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your database, Redis, and Stellar credentials
```

See [Configuration](#configuration) for all variables.

### 3. Set up the database

```bash
npm run db:migrate
npm run db:generate
```

### 4. Start the server

```bash
# Development (hot reload)
npm run dev

# Production
npm run build && npm start
```

### 5. Start the billing scheduler (separate process)

```bash
npx tsx src/scheduler.ts
```

The API is now running at `http://localhost:3000`.

---

## Project Structure

```
substrata-backend/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── config.ts              # Env-based configuration
│   ├── app.ts                 # Fastify app factory
│   ├── server.ts              # Entry point
│   ├── scheduler.ts           # Billing cron scheduler
│   ├── lib/
│   │   ├── prisma.ts          # Prisma client singleton
│   │   ├── redis.ts           # IORedis client
│   │   ├── logger.ts          # Pino logger
│   │   └── date-utils.ts      # Billing period helpers
│   ├── services/
│   │   ├── billing.service.ts # Billing engine (core logic)
│   │   ├── payment.service.ts # Stellar transaction builder
│   │   └── webhook.service.ts # Webhook emit & delivery
│   ├── queues/
│   │   └── index.ts           # BullMQ queue definitions
│   ├── workers/
│   │   ├── billing.worker.ts  # Processes billing jobs
│   │   └── webhook.worker.ts  # Dispatches webhook deliveries
│   └── routes/
│       ├── plans.ts           # GET/POST /plans
│       ├── subscriptions.ts   # CRUD /subscriptions
│       ├── payments.ts        # GET /payments, POST retry
│       ├── webhooks.ts        # Webhook endpoint management
│       └── wallets.ts         # Wallet verification
├── docs/
│   ├── ARCHITECTURE.md        # System design deep-dive
│   └── API.md                 # Full API reference
├── .env.example
├── CONTRIBUTING.md
└── package.json
```

---

## Configuration

All configuration is via environment variables. Copy `.env.example` to `.env`.

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `REDIS_URL` | — | `redis://localhost:6379` | Redis connection string |
| `STELLAR_NETWORK` | — | `testnet` | `testnet` or `mainnet` |
| `STELLAR_HORIZON_URL` | — | testnet URL | Horizon API endpoint |
| `STELLAR_NETWORK_PASSPHRASE` | — | testnet passphrase | Network identifier |
| `STELLAR_TREASURY_SECRET_KEY` | ✅ | — | Platform keypair that signs billing txs |
| `SOROBAN_RPC_URL` | — | testnet URL | Soroban RPC for smart contracts |
| `WEBHOOK_SIGNING_SECRET` | — | `dev-secret` | Default HMAC secret |
| `GRACE_PERIOD_HOURS` | — | `48` | Hours before cancelling after failed payment |
| `MAX_PAYMENT_RETRIES` | — | `3` | Max retry attempts per payment |
| `TEST_MODE` | — | `false` | Skip real Stellar transactions |

---

## API Reference

Full reference: **[docs/API.md](docs/API.md)**

### Base URL

```
http://localhost:3000/api/v1
```

### Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/plans` | List active plans |
| `POST` | `/plans` | Create a plan |
| `GET` | `/plans/:id` | Get a plan |
| `DELETE` | `/plans/:id` | Deactivate a plan |
| `POST` | `/subscriptions` | Create a subscription |
| `GET` | `/subscriptions/:id` | Get a subscription |
| `GET` | `/subscriptions` | List subscriptions |
| `POST` | `/subscriptions/:id/cancel` | Cancel a subscription |
| `GET` | `/payments` | List payments |
| `GET` | `/payments/:id` | Get a payment |
| `POST` | `/payments/:id/retry` | Retry a failed payment |
| `POST` | `/webhooks/endpoints` | Register a webhook endpoint |
| `GET` | `/webhooks/endpoints` | List webhook endpoints |
| `DELETE` | `/webhooks/endpoints/:id` | Deactivate an endpoint |
| `GET` | `/webhooks/events` | List recent events |
| `POST` | `/wallets/verify` | Verify a Stellar wallet signature |
| `GET` | `/wallets/:address` | Get wallet + subscriptions |
| `GET` | `/health` | Health check |

---

## Architecture

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the full system design, including:
- Data flow diagrams
- Billing cycle state machine
- Retry & grace period logic
- Webhook delivery pipeline
- Stellar transaction model

---

## Sister repositories

| Repo | Role |
|------|------|
| [Substrata-Contract](https://github.com/Recurraa/Substrata-Contract) | Soroban subscription protocol |
| [Substrata-Backend](https://github.com/Recurraa/Substrata-Backend) | Billing API, scheduler, webhooks (this repo) |
| [Substrata-Frontend](https://github.com/Recurraa/Substrata-Frontend) | Merchant + subscriber UI |

---

## Contributing

We welcome contributions! Please read **[CONTRIBUTING.md](CONTRIBUTING.md)** before opening a PR.

Quick summary:
1. Fork the repo
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit with conventional commits: `feat:`, `fix:`, `docs:`
4. Open a PR against `main`

---

## Roadmap

- [ ] Soroban smart contract integration for trustless billing
- [ ] Multi-tenant support (platform + merchant accounts)
- [ ] Dashboard UI (Next.js)
- [ ] Stripe-compatible webhook event format
- [ ] Metered / usage-based billing
- [ ] SDK (TypeScript, Python)
- [ ] Docker Compose production setup

---

## License

MIT — see [LICENSE](LICENSE).

---

<div align="center">
  Built with ❤️ on <a href="https://stellar.org">Stellar</a>
</div>
