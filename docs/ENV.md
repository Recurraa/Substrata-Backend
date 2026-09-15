# Environment

Required for billing + indexer:
- `DATABASE_URL`
- `REDIS_URL`
- `SUBSCRIPTION_CONTRACT_ID`
- `STELLAR_TREASURY_SECRET_KEY`
- `NODE_ENV` (`production` enforces wallet auth on writes)

Optional:
- `APP_FRONTEND_URL` — merchant UI origin (`https://sorobill-app.vercel.app` in production)
