import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { WebhookEventType } from "@prisma/client";

const createEndpointSchema = z.object({
  url: z.string().url(),
  secret: z.string().min(16),
  events: z.array(z.nativeEnum(WebhookEventType)).min(1),
});

export async function webhooksRoutes(app: FastifyInstance) {
  // Register a webhook endpoint
  app.post("/endpoints", async (req, reply) => {
    const body = createEndpointSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const endpoint = await prisma.webhookEndpoint.create({ data: body.data });
    return reply.status(201).send(endpoint);
  });

  // List webhook endpoints
  app.get("/endpoints", async () => {
    return prisma.webhookEndpoint.findMany({ orderBy: { createdAt: "desc" } });
  });

  // Delete / deactivate a webhook endpoint
  app.delete<{ Params: { id: string } }>("/endpoints/:id", async (req, reply) => {
    await prisma.webhookEndpoint.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    return reply.status(204).send();
  });

  // List recent webhook events
  app.get("/events", async () => {
    return prisma.webhookEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { deliveries: { select: { status: true, attemptCount: true } } },
    });
  });

  // List deliveries for an event
  app.get<{ Params: { eventId: string } }>("/events/:eventId/deliveries", async (req) => {
    return prisma.webhookDelivery.findMany({
      where: { webhookEventId: req.params.eventId },
      include: { endpoint: { select: { url: true } } },
    });
  });
}
