# Chain event indexer

## Endpoints
- `POST /api/v1/indexer/ingest` — upsert by `txHash` (wallet auth; unknown types rejected unless `strict: false`)
- `POST /api/v1/indexer/poll` — pull recent Soroban contract events from RPC and upsert (`startLedger?`)
- `GET /api/v1/indexer/events?limit=&type=` — newest first (`clampLimit`, max 200)

## Model
`ChainEvent`: type, contractId, txHash (unique), ledger?, payload Json, createdAt

## Poller
`pollSorobanEvents` reads the last ~50 ledgers (or an explicit `startLedger`), filters the configured subscription contract, and upserts known topics into Postgres. Safe to run from cron or the authenticated `/poll` route.
