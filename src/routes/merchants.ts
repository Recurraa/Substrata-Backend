import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { BillingInterval } from "@prisma/client";
import { asInputJson } from "../lib/json";

const createPlanSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  amount: z.string().regex(/^\d+(\.\d+)?$/),
  assetCode: z.string().default("XLM"),
  assetIssuer: z.string().optional(),
  interval: z.nativeEnum(BillingInterval),
  intervalCount: z.number().int().positive().default(1),
  trialDays: z.number().int().min(0).default(0),
  contractPlanId: z.number().int().min(0).optional(),
  tokenContractId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function merchantsRoutes(app: FastifyInstance) {
  // List plans for a merchant wallet
  app.get<{ Params: { address: string } }>("/:address/plans", async (req) => {
    return prisma.plan.findMany({
      where: {
        merchantAddress: req.params.address,
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
    });
  });

  // Create a plan owned by merchant
  app.post<{ Params: { address: string } }>("/:address/plans", async (req, reply) => {
    const body = createPlanSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const { metadata, ...rest } = body.data;
    const plan = await prisma.plan.create({
      data: {
        ...rest,
        merchantAddress: req.params.address,
        metadata: asInputJson(metadata),
      },
    });
    return reply.status(201).send(plan);
  });

  // Merchant stats summary
  app.get<{ Params: { address: string } }>("/:address/stats", async (req) => {
    const plans = await prisma.plan.findMany({
      where: { merchantAddress: req.params.address },
      include: {
        subscriptions: {
          where: { status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
        },
      },
    });

    const planIds = plans.map((p) => p.id);
    const payments = await prisma.payment.findMany({
      where: {
        status: "SUCCESS",
        subscription: { planId: { in: planIds } },
      },
    });

    const activeSubscribers = plans.reduce((n, p) => n + p.subscriptions.length, 0);
    const revenue = payments.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);

    return {
      activePlans: plans.filter((p) => p.isActive).length,
      activeSubscribers,
      revenueTotal: revenue.toFixed(2),
      successfulPayments: payments.length,
    };
  });

  // Time-series revenue for merchant dashboards (daily buckets, last 30 days)
  app.get<{ Params: { address: string } }>("/:address/revenue", async (req) => {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const plans = await prisma.plan.findMany({
      where: { merchantAddress: req.params.address },
      select: { id: true },
    });
    const planIds = plans.map((p) => p.id);
    if (!planIds.length) return [];

    const payments = await prisma.payment.findMany({
      where: {
        status: "SUCCESS",
        createdAt: { gte: since },
        subscription: { planId: { in: planIds } },
      },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const buckets = new Map<string, number>();
    for (const p of payments) {
      const day = p.createdAt.toISOString().slice(0, 10);
      buckets.set(day, (buckets.get(day) ?? 0) + parseFloat(p.amount || "0"));
    }

    return [...buckets.entries()].map(([date, amount]) => ({
      date,
      amount: amount.toFixed(2),
    }));
  });
}
