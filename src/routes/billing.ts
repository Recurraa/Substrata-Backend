import { FastifyInstance } from "fastify";
import { z } from "zod";
import { processBillingCycle, findDueSubscriptions } from "../services/billing.service";
import { billingQueue } from "../queues";

export async function billingRoutes(app: FastifyInstance) {
  // List due subscriptions
  app.get("/due", async () => {
    const due = await findDueSubscriptions();
    return { count: due.length, subscriptions: due.map((s) => s.id) };
  });

  // Enqueue a single subscription for billing
  app.post<{ Params: { subscriptionId: string } }>(
    "/run/:subscriptionId",
    async (req, reply) => {
      await billingQueue.add("bill", { subscriptionId: req.params.subscriptionId });
      return reply.status(202).send({ queued: true, subscriptionId: req.params.subscriptionId });
    }
  );

  // Run billing inline (useful for demos / test mode)
  app.post("/run-inline", async (req, reply) => {
    const schema = z.object({ subscriptionId: z.string() });
    const body = schema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    await processBillingCycle(body.data.subscriptionId);
    return { ok: true };
  });
}
