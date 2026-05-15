# Substrata — API Reference

> **[← Back to README](../README.md)**

All endpoints are prefixed with `/api/v1`. Requests and responses use `application/json`.

---

## Table of Contents

- [Authentication](#authentication)
- [Error Format](#error-format)
- [Plans](#plans)
- [Subscriptions](#subscriptions)
- [Payments](#payments)
- [Webhooks](#webhooks)
- [Wallets](#wallets)
- [Health](#health)

---

## Authentication

Substrata uses **Stellar keypair signatures** for wallet-level authentication. To prove ownership of a wallet:

1. Sign a challenge string with your Stellar secret key
2. Call `POST /wallets/verify` with the public key, message, and base64-encoded signature

API-level auth (API keys, JWT) is left to the integrating application layer.

---

## Error Format

All errors return a consistent shape:

```json
{
  "error": "Human-readable message"
}
```

Validation errors return the Zod flatten format:

```json
{
  "error": {
    "formErrors": [],
    "fieldErrors": {
      "amount": ["Invalid input"]
    }
  }
}
```

---

## Plans

### `GET /plans`

List all active plans.

**Response `200`**
```json
[
  {
    "id": "clx...",
    "name": "Pro Monthly",
    "description": "Full access, billed monthly",
    "amount": "10",
    "assetCode": "XLM",
    "assetIssuer": null,
    "interval": "MONTHLY",
    "intervalCount": 1,
    "trialDays": 7,
    "isActive": true,
    "metadata": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### `POST /plans`

Create a new billing plan.

**Request body**
```json
{
  "name": "Pro Monthly",
  "description": "Full access",
  "amount": "10",
  "assetCode": "XLM",
  "interval": "MONTHLY",
  "intervalCount": 1,
  "trialDays": 7
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | ✅ | Plan display name |
| `amount` | string | ✅ | Decimal amount (e.g. `"10"`, `"0.5"`) |
| `assetCode` | string | — | `XLM` (default) or custom asset code |
| `assetIssuer` | string | — | Required for non-XLM assets |
| `interval` | enum | ✅ | `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY` |
| `intervalCount` | number | — | Multiplier (default `1`) |
| `trialDays` | number | — | Free trial days (default `0`) |
| `metadata` | object | — | Arbitrary key-value data |

**Response `201`** — created plan object

---

### `GET /plans/:id`

Get a single plan by ID.

**Response `200`** — plan object  
**Response `404`** — `{ "error": "Plan not found" }`

---

### `DELETE /plans/:id`

Deactivate a plan (soft delete). Existing subscriptions are unaffected.

**Response `204`** — no content

---

## Subscriptions

### `POST /subscriptions`

Create a new subscription.

**Request body**
```json
{
  "planId": "clx...",
  "walletAddress": "GABC...XYZ",
  "metadata": { "userId": "usr_123" }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `planId` | string | ✅ | ID of an active plan |
| `walletAddress` | string | ✅ | Subscriber's Stellar public key (56 chars) |
| `metadata` | object | — | Arbitrary data (e.g. your internal user ID) |

**Response `201`**
```json
{
  "id": "clx...",
  "status": "ACTIVE",
  "currentPeriodStart": "2024-01-01T00:00:00.000Z",
  "currentPeriodEnd": "2024-02-01T00:00:00.000Z",
  "trialEndsAt": null,
  "plan": { ... },
  "wallet": { ... }
}
```

---

### `GET /subscriptions/:id`

Get a subscription with its last 10 payments.

**Response `200`** — subscription with `plan`, `wallet`, `payments[]`  
**Response `404`** — not found

---

### `GET /subscriptions`

List subscriptions. Supports filtering.

**Query params**

| Param | Description |
|---|---|
| `wallet` | Filter by Stellar address |
| `status` | Filter by status: `ACTIVE`, `PAST_DUE`, `CANCELLED`, `EXPIRED`, `TRIALING` |

**Response `200`** — array of subscriptions (max 50)

---

### `POST /subscriptions/:id/cancel`

Cancel a subscription.

**Request body**
```json
{ "immediately": false }
```

| Field | Type | Description |
|---|---|---|
| `immediately` | boolean | `true` = cancel now; `false` (default) = cancel at period end |

**Response `200`** — updated subscription

---

## Payments

### `GET /payments`

List payments.

**Query params**

| Param | Description |
|---|---|
| `subscriptionId` | Filter by subscription |
| `status` | `PENDING`, `PROCESSING`, `SUCCESS`, `FAILED`, `RETRYING` |

**Response `200`** — array of payments (max 50)

---

### `GET /payments/:id`

Get a single payment.

**Response `200`**
```json
{
  "id": "clx...",
  "subscriptionId": "clx...",
  "amount": "10",
  "assetCode": "XLM",
  "status": "SUCCESS",
  "stellarTxHash": "abc123...",
  "stellarLedger": 48291234,
  "retryCount": 0,
  "idempotencyKey": "clx...:2024-02-01T00:00:00.000Z",
  "testMode": false,
  "billingPeriodStart": "2024-01-01T00:00:00.000Z",
  "billingPeriodEnd": "2024-02-01T00:00:00.000Z"
}
```

---

### `POST /payments/:id/retry`

Manually enqueue a retry for a `FAILED` or `RETRYING` payment.

**Response `200`**
```json
{ "queued": true, "paymentId": "clx..." }
```

**Response `400`** — if payment is not in a retryable state

---

## Webhooks

### `POST /webhooks/endpoints`

Register a webhook endpoint.

**Request body**
```json
{
  "url": "https://yourapp.com/webhooks/substrata",
  "secret": "your-signing-secret-min-16-chars",
  "events": ["PAYMENT_SUCCESS", "PAYMENT_FAILED", "SUBSCRIPTION_CANCELLED"]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `url` | string (URL) | ✅ | HTTPS endpoint to receive events |
| `secret` | string | ✅ | Min 16 chars; used for HMAC signing |
| `events` | string[] | ✅ | Event types to subscribe to |

**Available event types:**
- `PAYMENT_SUCCESS`
- `PAYMENT_FAILED`
- `SUBSCRIPTION_CREATED`
- `SUBSCRIPTION_UPDATED`
- `SUBSCRIPTION_CANCELLED`

**Response `201`** — created endpoint

---

### `GET /webhooks/endpoints`

List all registered endpoints.

**Response `200`** — array of endpoints

---

### `DELETE /webhooks/endpoints/:id`

Deactivate a webhook endpoint.

**Response `204`** — no content

---

### `GET /webhooks/events`

List recent webhook events (last 50) with delivery status.

**Response `200`**
```json
[
  {
    "id": "clx...",
    "type": "PAYMENT_SUCCESS",
    "paymentId": "clx...",
    "payload": { ... },
    "createdAt": "2024-01-15T10:00:00.000Z",
    "deliveries": [
      { "status": "DELIVERED", "attemptCount": 1 }
    ]
  }
]
```

---

### `GET /webhooks/events/:eventId/deliveries`

List all delivery attempts for a specific event.

**Response `200`** — array of deliveries with endpoint URL

---

### Webhook Payload Format

Every webhook POST to your endpoint has this body:

```json
{
  "id": "evt_clx...",
  "type": "PAYMENT_SUCCESS",
  "createdAt": "2024-01-15T10:00:00.000Z",
  "data": {
    "subscriptionId": "clx...",
    "amount": "10",
    "assetCode": "XLM"
  }
}
```

And these headers:

```
Content-Type: application/json
X-Substrata-Signature: <hmac-sha256-hex>
X-Substrata-Event: PAYMENT_SUCCESS
```

**Verifying the signature:**

```typescript
import crypto from "crypto";

app.post("/webhooks/substrata", (req, res) => {
  const sig = req.headers["x-substrata-signature"] as string;
  const body = JSON.stringify(req.body);
  const expected = crypto
    .createHmac("sha256", process.env.WEBHOOK_SECRET!)
    .update(body)
    .digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) {
    return res.status(401).send("Invalid signature");
  }

  // process event...
  res.status(200).send("ok");
});
```

---

## Wallets

### `POST /wallets/verify`

Verify a Stellar wallet by checking a signed message. Used for wallet-based authentication.

**Request body**
```json
{
  "address": "GABC...XYZ",
  "message": "substrata:auth:1704067200",
  "signature": "<base64-encoded Ed25519 signature>"
}
```

**Signing the message (client-side):**

```typescript
import { Keypair } from "@stellar/stellar-sdk";

const keypair = Keypair.fromSecret("S...");
const message = `substrata:auth:${Math.floor(Date.now() / 1000)}`;
const signature = keypair.sign(Buffer.from(message)).toString("base64");
```

**Response `200`**
```json
{ "verified": true, "walletId": "clx..." }
```

**Response `401`** — `{ "error": "Invalid signature" }`

---

### `GET /wallets/:address`

Get wallet info and all subscriptions for a Stellar address.

**Response `200`**
```json
{
  "id": "clx...",
  "address": "GABC...XYZ",
  "isVerified": true,
  "subscriptions": [
    {
      "id": "clx...",
      "status": "ACTIVE",
      "plan": { "name": "Pro Monthly", "amount": "10" }
    }
  ]
}
```

**Response `404`** — wallet not found

---

## Health

### `GET /health`

**Response `200`**
```json
{ "status": "ok", "ts": "2024-01-15T10:00:00.000Z" }
```
