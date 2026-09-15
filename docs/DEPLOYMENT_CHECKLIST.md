# Deployment checklist

1. Postgres + Redis provisioned
2. `prisma db push` / migrate
3. `SUBSCRIPTION_CONTRACT_ID` matches contract DEPLOYMENTS.md
4. Treasury key = contract admin
5. Health `GET /health` green
6. Indexer ingest smoke (optional)
