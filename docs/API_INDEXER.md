# Indexer API quick reference

```http
POST /api/v1/indexer/ingest
Content-Type: application/json

{"type":"payment_executed","contractId":"C...","txHash":"…","ledger":123,"payload":{}}
```

```http
GET /api/v1/indexer/events?limit=50
```
