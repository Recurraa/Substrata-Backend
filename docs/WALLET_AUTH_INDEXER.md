# Wallet auth on indexer ingest

`POST /indexer/ingest` uses `requireWalletAuth` so untrusted clients cannot
flood mirrored events in production.
