import {
  signWebhookPayload,
  verifyWebhookSignature as verifySig,
} from "../lib/webhook-crypto";
import axios from "axios";
import { WebhookEventType, WebhookDeliveryStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

/**
 * Create a WebhookEvent and queue deliveries to all matching endpoints.
 */
export async function emitWebhookEvent(
  type: WebhookEventType,
  paymentId: string | null,
  payload: Record<string, unknown>
): Promise<void> {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { isActive: true, events: { has: type } },
  });

  if (!endpoints.length) return;

  const event = await prisma.webhookEvent.create({
    data: { type, paymentId, payload },
  });

  await prisma.webhookDelivery.createMany({
    data: endpoints.map((ep) => ({
      webhookEventId: event.id,
      webhookEndpointId: ep.id,
    })),
  });
}

/**
 * Deliver a single WebhookDelivery. Called by the webhook worker.
 */
export async function deliverWebhook(deliveryId: string): Promise<void> {
  const delivery = await prisma.webhookDelivery.findUniqueOrThrow({
    where: { id: deliveryId },
    include: { event: true, endpoint: true },
  });

  const body = JSON.stringify({
    id: delivery.event.id,
    type: delivery.event.type,
    createdAt: delivery.event.createdAt,
    data: delivery.event.payload,
  });

  const signature = signWebhookPayload(delivery.endpoint.secret, body);

  try {
    const res = await axios.post(delivery.endpoint.url, body, {
      headers: {
        "Content-Type": "application/json",
        "X-Substrata-Signature": signature,
        "X-Substrata-Event": delivery.event.type,
      },
      timeout: 10_000,
    });

    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: WebhookDeliveryStatus.DELIVERED,
        responseStatus: res.status,
        responseBody: String(res.data).slice(0, 500),
        deliveredAt: new Date(),
        attemptCount: { increment: 1 },
      },
    });
  } catch (err: any) {
    const responseStatus = err?.response?.status;
    const responseBody = String(err?.response?.data ?? err?.message).slice(0, 500);

    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: WebhookDeliveryStatus.FAILED,
        responseStatus,
        responseBody,
        attemptCount: { increment: 1 },
      },
    });

    logger.warn({ deliveryId, responseStatus }, "Webhook delivery failed");
    throw err;
  }
}

export function signPayload(body: string, secret: string): string {
  return signWebhookPayload(secret, body);
}

export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  return verifySig(secret, body, signature);
}
