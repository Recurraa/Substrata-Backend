# Soroban billing

Set in `.env`:

```
SUBSCRIPTION_CONTRACT_ID=C...
STELLAR_TREASURY_SECRET_KEY=S...
USE_SOROBAN_BILLING=true
TEST_MODE=false
```

The treasury keypair **must** be the contract admin (same identity used in `initialize`).

Billing path:
1. Scheduler finds due subscriptions
2. Worker calls `processBillingCycle`
3. If `contractPlanId` is set → `executeSorobanBilling` → `execute_billing`
4. Webhook `PAYMENT_SUCCESS` / failure handling follows
