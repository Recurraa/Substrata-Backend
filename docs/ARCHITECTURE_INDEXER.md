# Indexer architecture

Workers or RPC watchers call `POST /indexer/ingest`. Events are upserted by
`txHash` so retries are idempotent. The API list endpoint is read-only for
dashboards and demos.
