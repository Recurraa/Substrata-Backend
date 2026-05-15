/**
 * Standalone scheduler process.
 * Run alongside the API server: `node dist/scheduler.js`
 *
 * Uses setInterval for simplicity. In production, consider:
 * - BullMQ's built-in repeatable jobs
 * - A dedicated cron service (e.g., pg_cron, Kubernetes CronJob)
 */
import { billingQueue } from "./queues/index";
import { scheduleBillingJobs } from "./workers/billing.worker";
import { logger } from "./lib/logger";

const INTERVAL_MS = 60_000; // every 60 seconds

async function tick() {
  try {
    await scheduleBillingJobs(billingQueue);
  } catch (err) {
    logger.error({ err }, "Scheduler tick failed");
  }
}

logger.info("Billing scheduler started");
tick(); // run immediately on start
setInterval(tick, INTERVAL_MS);
