# Sorobill Backend Demo

## Prerequisites

- Docker + Docker Compose
- Node.js ≥ 20
- A Stellar testnet keypair for the billing admin (same as contract admin)

## 10-minute local setup

```bash
# 1. Infra
docker compose up -d

# 2. Env
cp .env.example .env
# Set STELLAR_TREASURY_SECRET_KEY and SUBSCRIPTION_CONTRACT_ID (from Sorobill-Contract DEPLOYMENTS.md)
# Keep TEST_MODE=true for dry runs without chain fees

# 3. DB
npm install
npm run db:generate
npx prisma db push

# 4. API + scheduler
npm run dev
# in another terminal:
npx tsx src/scheduler.ts
```

API: http://localhost:3001  
Health: http://localhost:3001/health

## Smoke test

```bash
curl -s http://localhost:3001/health | jq

curl -s -X POST http://localhost:3001/api/v1/merchants/G.../plans \
  -H 'content-type: application/json' \
  -d '{"name":"Pro","amount":"10","interval":"MONTHLY","assetCode":"XLM"}' | jq
```

## Sister repos

- [Sorobill-Contract](https://github.com/Sorobill/Sorobill-Contract)
- [Sorobill-App](https://github.com/Sorobill/Sorobill-App) — live UI: [https://sorobill-app.vercel.app](https://sorobill-app.vercel.app)
