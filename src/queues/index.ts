import { Queue } from "bullmq";
import { redis } from "../lib/redis";

export const billingQueue = new Queue("billing", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5_000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export const webhookQueue = new Queue("webhooks", {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 2_000 },
    removeOnComplete: 200,
    removeOnFail: 500,
  },
});

// Job type definitions
export interface BillingJobData {
  subscriptionId: string;
}

export interface WebhookJobData {
  deliveryId: string;
}
