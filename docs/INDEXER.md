# Chain event indexer

## Endpoints
- `POST /api/v1/indexer/ingest` — upsert by `txHash` (wallet auth in production)
- `GET /api/v1/indexer/events?limit=` — newest first (`clampLimit`, max 200)

## Model
`ChainEvent`: type, contractId, txHash (unique), ledger?, payload Json, createdAt
