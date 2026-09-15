import { Worker, Job } from "bullmq";
import { redis } from "../lib/redis";
import { logger } from "../lib/logger";
import { deliverWebhook } from "../services/webhook.service";
import { WebhookJobData } from "../queues/index";

export const webhookWorker = new Worker<WebhookJobData>(
  "webhooks",
  async (job: Job<WebhookJobData>) => {
    const { deliveryId } = job.data;
    logger.info({ deliveryId, jobId: job.id }, "Dispatching webhook");
    await deliverWebhook(deliveryId);
  },
  {
    connection: redis,
    concurrency: 20,
  }
);

webhookWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err: err.message }, "Webhook job failed");
});

webhookWorker.on("completed", (job) => {
  logger.info({ jobId: job.id }, "Webhook delivered");
});
