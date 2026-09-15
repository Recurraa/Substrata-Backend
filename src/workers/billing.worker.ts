import { Worker, Job } from "bullmq";
import { redis } from "../lib/redis";
import { logger } from "../lib/logger";
import {
  findDueSubscriptions,
  processBillingCycle,
  expireGracePeriods,
} from "../services/billing.service";
import { BillingJobData } from "../queues/index";

/**
 * Worker: processes a single subscription billing cycle.
 */
export const billingWorker = new Worker<BillingJobData>(
  "billing",
  async (job: Job<BillingJobData>) => {
    const { subscriptionId } = job.data;
    logger.info({ subscriptionId, jobId: job.id }, "Processing billing cycle");
    await processBillingCycle(subscriptionId);
  },
  {
    connection: redis,
    concurrency: 10,
  }
);

billingWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err: err.message }, "Billing job failed");
});

billingWorker.on("completed", (job) => {
  logger.info({ jobId: job.id }, "Billing job completed");
});

/**
 * Scheduler: runs every minute, enqueues due subscriptions.
 * In production, use a dedicated scheduler process or BullMQ Scheduler.
 */
export async function scheduleBillingJobs(queue: import("bullmq").Queue) {
  const due = await findDueSubscriptions();
  logger.info({ count: due.length }, "Enqueuing due subscriptions");

  for (const sub of due) {
    await queue.add(
      "process-subscription",
      { subscriptionId: sub.id },
      {
        jobId: `billing:${sub.id}:${sub.currentPeriodEnd.toISOString()}`, // dedup
      }
    );
  }

  await expireGracePeriods();
}
