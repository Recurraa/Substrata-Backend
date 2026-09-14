import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";

export async function statsRoutes(app: FastifyInstance) {
  app.get("/overview", async () => {
    const [plans, subscriptions, payments] = await Promise.all([
      prisma.plan.count({ where: { isActive: true } }),
      prisma.subscription.count({ where: { status: { in: ["ACTIVE", "TRIALING"] } } }),
      prisma.payment.count({ where: { status: "SUCCESS" } }),
    ]);
    return { activePlans: plans, activeSubscriptions: subscriptions, successfulPayments: payments };
  });
}
