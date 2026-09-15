# Docker setup

```bash
docker compose up -d
docker compose ps
```

Services:

| Service | Port | Credentials |
|---------|------|-------------|
| Postgres 16 | 5432 | postgres / password / db sorobill |
| Redis 7 | 6379 | — |

Then:

```bash
cp .env.example .env
npm install
npx prisma db push
npm run dev
```

API listens on port **3001** by default.
