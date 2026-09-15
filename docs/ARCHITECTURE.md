# Sorobill — Architecture

> **[← Back to README](../README.md)**

This document describes the internal design of Sorobill: how data flows, how billing cycles work, and how each subsystem fits together.

---

## Table of Contents

- [High-Level Overview](#high-level-overview)
- [Component Map](#component-map)
- [Data Flow: Subscription Lifecycle](#data-flow-subscription-lifecycle)
- [Billing Cycle State Machine](#billing-cycle-state-machine)
- [Retry & Grace Period Logic](#retry--grace-period-logic)
- [Webhook Delivery Pipeline](#webhook-delivery-pipeline)
- [Stellar Transaction Model](#stellar-transaction-model)
- [Database Schema](#database-schema)
- [Queue Architecture](#queue-architecture)
- [Security Model](#security-model)

---

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        External Clients                         │
│              (SaaS apps, mobile apps, dashboards)               │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST API
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Fastify API Server                         │
│   /plans  /subscriptions  /payments  /webhooks  /wallets        │
└──────┬──────────────────────────────────────────────┬───────────┘
       │ writes                                       │ reads
       ▼                                              ▼
┌─────────────┐                              ┌───────────────────┐
│  PostgreSQL │◄─────────────────────────────│  Prisma ORM       │
│  (via Prisma│                              └───────────────────┘
└──────┬──────┘
       │
       │ billing jobs
       ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BullMQ (Redis)                           │
│   billing queue          │         webhook queue                │
│   billing worker         │         webhook worker               │
└──────────────────────────┼─────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Stellar Network                             │
│   Horizon API  ──  Transaction submission                       │
│   Soroban RPC  ──  Smart contract calls (future)                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Map

| Component | File | Responsibility |
|---|---|---|
| API Server | `src/app.ts`, `src/server.ts` | HTTP layer, route registration, graceful shutdown |
| Config | `src/config.ts` | Typed env-var access |
| Billing Engine | `src/services/billing.service.ts` | Period calculation, due detection, grace period expiry |
| Payment Service | `src/services/payment.service.ts` | Stellar tx builder, idempotency, test mode |
| Webhook Service | `src/services/webhook.service.ts` | Event emission, HMAC signing, HTTP delivery |
| Billing Worker | `src/workers/billing.worker.ts` | Consumes billing queue, calls billing engine |
| Webhook Worker | `src/workers/webhook.worker.ts` | Consumes webhook queue, calls webhook service |
| Scheduler | `src/scheduler.ts` | Polls for due subscriptions every 60s, enqueues jobs |
| Queues | `src/queues/index.ts` | BullMQ queue definitions with retry config |
| Prisma | `src/lib/prisma.ts` | Singleton DB client |
| Redis | `src/lib/redis.ts` | IORedis client (shared by BullMQ) |
| Logger | `src/lib/logger.ts` | Pino structured logger |

---

## Data Flow: Subscription Lifecycle

```
Client                  API                  DB              Stellar
  │                      │                   │                  │
  │  POST /subscriptions │                   │                  │
  │─────────────────────►│                   │                  │
  │                      │  upsert Wallet    │                  │
  │                      │──────────────────►│                  │
  │                      │  create Sub       │                  │
  │                      │──────────────────►│                  │
  │                      │  emit CREATED     │                  │
  │                      │──────────────────►│                  │
  │◄─────────────────────│                   │                  │
  │   201 { sub }        │                   │                  │
  │                      │                   │                  │
  │         ... time passes, period ends ... │                  │
  │                      │                   │                  │
  │              Scheduler tick              │                  │
  │                      │  findDue()        │                  │
  │                      │──────────────────►│                  │
  │                      │  enqueue job      │                  │
  │                      │──────────────────►│ (Redis)          │
  │                      │                   │                  │
  │              Billing Worker              │                  │
  │                      │  processCycle()   │                  │
  │                      │──────────────────►│                  │
  │                      │  create Payment   │                  │
  │                      │──────────────────►│                  │
  │                      │  submitPayment()  │                  │
  │                      │─────────────────────────────────────►│
  │                      │                   │   tx hash        │
  │                      │◄─────────────────────────────────────│
  │                      │  update Payment   │                  │
  │                      │──────────────────►│                  │
  │                      │  advance period   │                  │
  │                      │──────────────────►│                  │
  │                      │  emit SUCCESS     │                  │
  │                      │──────────────────►│                  │
```

---

## Billing Cycle State Machine

```
                    ┌──────────┐
                    │ TRIALING │
                    └────┬─────┘
                         │ trial ends
                         ▼
  ┌──────────────────►ACTIVE◄──────────────────────┐
  │                    │                            │
  │                    │ period ends                │
  │                    ▼                            │
  │             payment attempt                     │
  │            /              \                     │
  │       success            failure                │
  │          │                  │                   │
  │    advance period     retry (backoff)           │
  │          │                  │                   │
  │          │           max retries?               │
  │          │            /         \               │
  │          │          no          yes             │
  │          │           │           │              │
  │          │      schedule     PAST_DUE           │
  │          │      retry           │               │
  │          │                grace period          │
  │          │                expires?              │
  │          │               /        \             │
  │          │             no         yes           │
  │          │              │           │           │
  │          │         still due   CANCELLED        │
  │          │                                      │
  └──────────┘                                      │
                                                    │
  cancel immediately ──────────────────────────────►│
  cancel at period end ─► ACTIVE until end ─────────┘
```

---

## Retry & Grace Period Logic

When a payment fails:

1. **Retry count < MAX_PAYMENT_RETRIES** (default 3):
   - Payment status → `RETRYING`
   - `nextRetryAt` = now + 2^retryCount hours (exponential backoff)
   - Scheduler picks it up on next tick

2. **Retry count ≥ MAX_PAYMENT_RETRIES**:
   - Subscription status → `PAST_DUE`
   - `gracePeriodEndsAt` = now + GRACE_PERIOD_HOURS (default 48h)
   - Webhook `PAYMENT_FAILED` fired
   - If user pays manually or updates payment method within grace period → back to `ACTIVE`
   - If grace period expires → `CANCELLED`, webhook `SUBSCRIPTION_CANCELLED` fired

Backoff schedule (default config):
| Attempt | Delay |
|---|---|
| 1 | 2 hours |
| 2 | 4 hours |
| 3 | 8 hours |
| Grace | 48 hours |

---

## Webhook Delivery Pipeline

```
emitWebhookEvent(type, paymentId, payload)
        │
        ▼
  WebhookEvent created in DB
        │
        ▼
  WebhookDelivery rows created (one per matching endpoint)
        │
        ▼
  webhookQueue.add({ deliveryId }) for each delivery
        │
        ▼
  Webhook Worker picks up job
        │
        ▼
  POST to endpoint URL
  Headers:
    X-Sorobill-Signature: HMAC-SHA256(body, endpoint.secret)
    X-Sorobill-Event: PAYMENT_SUCCESS
        │
       / \
    200   error
     │      │
  DELIVERED  FAILED → BullMQ retries (5 attempts, exponential)
```

**Verifying signatures on your server:**

```typescript
import crypto from "crypto";

function verify(body: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
```

---

## Stellar Transaction Model

Each billing payment is a standard Stellar `payment` operation:

```
Source account:  STELLAR_TREASURY_SECRET_KEY (platform wallet)
Destination:     subscriber's Stellar public key
Asset:           XLM (native) or custom asset (e.g. USDC)
Amount:          plan.amount
Memo:            idempotency key (first 28 chars)
```

**Idempotency** is enforced at two levels:
1. DB: `Payment.idempotencyKey` is unique — duplicate inserts are rejected
2. Stellar: the memo carries the key; duplicate submissions are detected by checking existing `stellarTxHash`

**Test mode** (`TEST_MODE=true`): no real transaction is submitted. A mock hash `test_<idempotencyKey>` is stored instead. Use this for development and CI.

---

## Database Schema

```
Plan ──< Subscription >── Wallet
              │
              └──< Payment >──< WebhookEvent >──< WebhookDelivery >── WebhookEndpoint
```

Key indexes:
- `subscriptions(status, currentPeriodEnd)` — billing processor query
- `payments(status, nextRetryAt)` — retry processor query
- `webhook_deliveries(status, nextRetryAt)` — delivery retry query

---

## Queue Architecture

Two BullMQ queues backed by Redis:

### `billing` queue
- **Producer**: `src/scheduler.ts` (every 60s)
- **Consumer**: `src/workers/billing.worker.ts` (concurrency: 10)
- **Job dedup**: `jobId = billing:{subscriptionId}:{periodEnd}` prevents double-billing
- **Retries**: 3 attempts, exponential backoff starting at 5s

### `webhooks` queue
- **Producer**: `src/services/webhook.service.ts`
- **Consumer**: `src/workers/webhook.worker.ts` (concurrency: 20)
- **Retries**: 5 attempts, exponential backoff starting at 2s

---

## Security Model

| Concern | Approach |
|---|---|
| Webhook authenticity | HMAC-SHA256 per-endpoint secret, `timingSafeEqual` comparison |
| Wallet authentication | Stellar keypair signature verification (Ed25519) |
| Treasury key | Env var only, never stored in DB |
| SQL injection | Prisma parameterized queries |
| Rate limiting | `@fastify/rate-limit` (100 req/min default) |
| Transport | HTTPS in production (terminate at load balancer) |
| Secrets in logs | Pino redaction (add `redact` config for sensitive fields) |
