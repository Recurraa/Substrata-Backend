# Deploying Sorobill API

## Railway / Fly

1. Provision Postgres + Redis.
2. Set env from `.env.example` (`DATABASE_URL`, `REDIS_URL`, `STELLAR_TREASURY_SECRET_KEY`, `SUBSCRIPTION_CONTRACT_ID`).
3. Build: `npm ci && npx prisma generate && npx prisma db push && npm run build`
4. Start API: `node dist/server.js`
5. Start scheduler: `npx tsx src/scheduler.ts` (or a second process).

## Docker

```bash
docker compose up -d
docker build -t sorobill-api .
docker run --env-file .env -p 3001:3001 sorobill-api
```

Health: `GET /health`
