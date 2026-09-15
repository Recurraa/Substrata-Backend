# Soroban event mirroring

Map contract topics from Sorobill-Contract `docs/EVENTS.md` into `ChainEvent.type`.
Prefer exact topic strings (`payment_executed`, `sub_cancelled`, …).

## Polling

Use `POST /api/v1/indexer/poll` (wallet auth) to pull recent contract events into `ChainEvent`.
