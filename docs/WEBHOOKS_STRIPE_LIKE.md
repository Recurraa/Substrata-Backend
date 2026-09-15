# Stripe-like webhook mapping

Internal enum → Stripe-shaped `type`:

| Internal | Stripe-like |
|---|---|
| PAYMENT_SUCCESS | invoice.paid |
| PAYMENT_FAILED | invoice.payment_failed |
| SUBSCRIPTION_CREATED | customer.subscription.created |
| SUBSCRIPTION_UPDATED | customer.subscription.updated |
| SUBSCRIPTION_CANCELLED | customer.subscription.deleted |

Use `buildStripeLikePayload` in `src/lib/webhook-payload.ts`.
