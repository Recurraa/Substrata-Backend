# Indexer idempotency

Ingest upserts on `txHash`. Retries with the same hash update `type`, `payload`,
and `ledger` without creating duplicates.
