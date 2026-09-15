# Wallet auth

Write routes may use `requireWalletAuth`:

Headers:
- `x-stellar-address`
- `x-stellar-message`
- `x-stellar-signature` (base64)

Skipped in non-production when headers are absent. Required in production.
