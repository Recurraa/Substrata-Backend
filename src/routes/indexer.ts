import { FastifyInstance } from "fastify";
import { z } from "zod";
import { ingestChainEvent, listChainEvents } from "../services/indexer.service";
import { clampLimit } from "../lib/pagination";
import { requireWalletAuth } from "../middleware/auth";

export async function indexerRoutes(app: FastifyInstance) {
  app.post("/ingest", { preHandler: requireWalletAuth }, async (req, reply) => {
    const schema = z.object({
      type: z.string().min(1),
      contractId: z.string().min(1),
      txHash: z.string().min(1),
      ledger: z.number().int().optional(),
      payload: z.record(z.unknown()).default({}),
    });
    const body = schema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const event = await ingestChainEvent(body.data);
    return reply.status(201).send(event);
  });

  app.get<{ Querystring: { limit?: string } }>("/events", async (req) => {
    return listChainEvents(clampLimit(req.query.limit, 50, 200));
  });
}
