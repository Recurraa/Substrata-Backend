import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { BillingInterval } from "@prisma/client";

const createPlanSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  amount: z.string().regex(/^\d+(\.\d+)?$/),
  assetCode: z.string().default("XLM"),
  assetIssuer: z.string().optional(),
  interval: z.nativeEnum(BillingInterval),
  intervalCount: z.number().int().positive().default(1),
  trialDays: z.number().int().min(0).default(0),
  metadata: z.record(z.unknown()).optional(),
});

export async function plansRoutes(app: FastifyInstance) {
  // List all active plans
  app.get("/", async () => {
    return prisma.plan.findMany({ where: { isActive: true }, orderBy: { createdAt: "desc" } });
  });

  // Get a single plan
  app.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const plan = await prisma.plan.findUnique({ where: { id: req.params.id } });
    if (!plan) return reply.status(404).send({ error: "Plan not found" });
    return plan;
  });

  // Create a plan
  app.post("/", async (req, reply) => {
    const body = createPlanSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const plan = await prisma.plan.create({ data: body.data });
    return reply.status(201).send(plan);
  });

  // Deactivate a plan
  app.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    await prisma.plan.update({ where: { id: req.params.id }, data: { isActive: false } });
    return reply.status(204).send();
  });
}
