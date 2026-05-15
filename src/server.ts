import { buildApp } from "./app";
import { config } from "./config";
import { logger } from "./lib/logger";
import { billingWorker } from "./workers/billing.worker";
import { webhookWorker } from "./workers/webhook.worker";

async function main() {
  const app = await buildApp();

  await app.listen({ port: config.port, host: "0.0.0.0" });
  logger.info(`Server running on port ${config.port}`);
  logger.info(`Test mode: ${config.billing.testMode}`);

  const shutdown = async () => {
    logger.info("Shutting down...");
    await app.close();
    await billingWorker.close();
    await webhookWorker.close();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  logger.error(err, "Fatal startup error");
  process.exit(1);
});
