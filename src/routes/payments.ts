import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { PaymentStatus } from "@prisma/client";
import { billingQueue } from "../../queues/index";

export async function paymentsRoutes(app: FastifyInstance) {
  // List payments for a subscription
  app.get<{ Querystring: { subscriptionId?: string; status?: string } }>(
    "/",
    async (req) => {
      const { subscriptionId, status } = req.query;
      return prisma.payment.findMany({
        where: {
          ...(subscriptionId ? { subscriptionId } : {}),
          ...(status ? { status: status as PaymentStatus } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    }
  );

  // Get a single payment
  app.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });
    if (!payment) return reply.status(404).send({ error: "Payment not found" });
    return payment;
  });

  // Manually retry a failed payment
  app.post<{ Params: { id: string } }>("/:id/retry", async (req, reply) => {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: { subscription: true },
    });

    if (!payment) return reply.status(404).send({ error: "Payment not found" });
    if (payment.status !== PaymentStatus.FAILED && payment.status !== PaymentStatus.RETRYING) {
      return reply.status(400).send({ error: "Payment is not in a retryable state" });
    }

    await billingQueue.add(
      "retry-payment",
      { subscriptionId: payment.subscriptionId },
      { jobId: `retry:${payment.id}:${Date.now()}` }
    );

    return { queued: true, paymentId: payment.id };
  });
}
