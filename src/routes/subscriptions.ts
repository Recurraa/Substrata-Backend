import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { SubscriptionStatus } from "@prisma/client";
import { nextPeriod } from "../services/billing.service";
import { emitWebhookEvent } from "../services/webhook.service";
import { clampLimit } from "../lib/pagination";
import { asInputJson } from "../lib/json";

const createSubSchema = z.object({
  planId: z.string(),
  walletAddress: z.string().length(56), // Stellar public key
  metadata: z.record(z.unknown()).optional(),
});

export async function subscriptionsRoutes(app: FastifyInstance) {
  // Create subscription
  app.post("/", async (req, reply) => {
    const body = createSubSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const plan = await prisma.plan.findUnique({ where: { id: body.data.planId } });
    if (!plan || !plan.isActive) return reply.status(404).send({ error: "Plan not found" });

    // Upsert wallet
    const wallet = await prisma.wallet.upsert({
      where: { address: body.data.walletAddress },
      create: { address: body.data.walletAddress },
      update: {},
    });

    const now = new Date();
    const trialEndsAt =
      plan.trialDays > 0
        ? new Date(now.getTime() + plan.trialDays * 86_400_000)
        : null;
    const periodStart = trialEndsAt ?? now;
    const periodEnd = nextPeriod(periodStart, plan.interval, plan.intervalCount);

    const sub = await prisma.subscription.create({
      data: {
        planId: plan.id,
        walletId: wallet.id,
        status: trialEndsAt ? SubscriptionStatus.TRIALING : SubscriptionStatus.ACTIVE,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        trialEndsAt,
        contractPlanId: plan.contractPlanId ?? undefined,
        metadata: asInputJson(body.data.metadata),
      },
      include: { plan: true, wallet: true },
    });

    await emitWebhookEvent("SUBSCRIPTION_CREATED", null, { subscriptionId: sub.id });
    return reply.status(201).send(sub);
  });

  // Get subscription
  app.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const sub = await prisma.subscription.findUnique({
      where: { id: req.params.id },
      include: { plan: true, wallet: true, payments: { orderBy: { createdAt: "desc" }, take: 10 } },
    });
    if (!sub) return reply.status(404).send({ error: "Subscription not found" });
    return sub;
  });

  // List subscriptions (filter by subscriber wallet and/or merchant)
  app.get<{
    Querystring: {
      wallet?: string;
      address?: string;
      merchant?: string;
      status?: string;
      limit?: string;
    };
  }>("/", async (req) => {
    const { wallet, address, merchant, status, limit } = req.query;
    const walletFilter = wallet || address;
    return prisma.subscription.findMany({
      where: {
        ...(walletFilter ? { wallet: { address: walletFilter } } : {}),
        ...(merchant ? { plan: { merchantAddress: merchant } } : {}),
        ...(status ? { status: status as SubscriptionStatus } : {}),
      },
      include: { plan: true, wallet: true },
      orderBy: { createdAt: "desc" },
      take: clampLimit(limit),
    });
  });

  // Cancel subscription
  app.post<{ Params: { id: string }; Body: { immediately?: boolean } }>(
    "/:id/cancel",
    async (req, reply) => {
      const { immediately = false } = req.body ?? {};
      const sub = await prisma.subscription.findUnique({ where: { id: req.params.id } });
      if (!sub) return reply.status(404).send({ error: "Subscription not found" });

      const updated = await prisma.subscription.update({
        where: { id: req.params.id },
        data: {
          cancelAtPeriodEnd: !immediately,
          status: immediately ? SubscriptionStatus.CANCELLED : sub.status,
          cancelledAt: immediately ? new Date() : null,
        },
      });

      await emitWebhookEvent("SUBSCRIPTION_CANCELLED", null, {
        subscriptionId: sub.id,
        immediately,
      });

      return updated;
    }
  );

  // Pause billing
  app.post<{ Params: { id: string } }>("/:id/pause", async (req, reply) => {
    const sub = await prisma.subscription.findUnique({ where: { id: req.params.id } });
    if (!sub) return reply.status(404).send({ error: "Subscription not found" });
    if (sub.paused) return reply.status(409).send({ error: "Already paused" });

    return prisma.subscription.update({
      where: { id: req.params.id },
      data: { paused: true },
    });
  });

  // Resume billing
  app.post<{ Params: { id: string } }>("/:id/resume", async (req, reply) => {
    const sub = await prisma.subscription.findUnique({
      where: { id: req.params.id },
      include: { plan: true },
    });
    if (!sub) return reply.status(404).send({ error: "Subscription not found" });
    if (!sub.paused) return reply.status(409).send({ error: "Not paused" });

    const now = new Date();
    return prisma.subscription.update({
      where: { id: req.params.id },
      data: {
        paused: false,
        currentPeriodStart: now,
        currentPeriodEnd: nextPeriod(now, sub.plan.interval, sub.plan.intervalCount),
      },
    });
  });
}