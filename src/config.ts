import "dotenv/config";

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const config = {
  env: process.env.NODE_ENV ?? "development",
  port: parseInt(process.env.PORT ?? "3001", 10),
  logLevel: process.env.LOG_LEVEL ?? "info",

  db: {
    url: required("DATABASE_URL"),
  },

  redis: {
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
  },

  stellar: {
    network: process.env.STELLAR_NETWORK ?? "testnet",
    horizonUrl:
      process.env.STELLAR_HORIZON_URL ??
      "https://horizon-testnet.stellar.org",
    networkPassphrase:
      process.env.STELLAR_NETWORK_PASSPHRASE ??
      "Test SDF Network ; September 2015",
    treasurySecretKey: process.env.STELLAR_TREASURY_SECRET_KEY ?? "",
    sorobanRpcUrl:
      process.env.SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org",
    subscriptionContractId: process.env.SUBSCRIPTION_CONTRACT_ID ?? "",
  },

  webhooks: {
    signingSecret: process.env.WEBHOOK_SIGNING_SECRET ?? "dev-secret",
  },

  billing: {
    gracePeriodHours: parseInt(process.env.GRACE_PERIOD_HOURS ?? "48", 10),
    maxRetries: parseInt(process.env.MAX_PAYMENT_RETRIES ?? "3", 10),
    testMode: process.env.TEST_MODE === "true",
    useSorobanBilling: process.env.USE_SOROBAN_BILLING !== "false",
  },
} as const;
