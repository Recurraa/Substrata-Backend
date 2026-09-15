import { FastifyInstance } from "fastify";
import { z } from "zod";
import { ingestChainEvent, listChainEvents } from "../services/indexer.service";
import { clampLimit } from "../lib/pagination";
import { requireWalletAuth } from "../middleware/auth";
import { assertIngestableType } from "../services/indexer.validators";
import { IndexerValidationError } from "../lib/indexer-errors";

export async function indexerRoutes(app: FastifyInstance) {
  app.post("/ingest", { preHandler: requireWalletAuth }, async (req, reply) => {
    const schema = z.object({
      type: z.string().min(1),
      contractId: z.string().min(1),
      txHash: z.string().min(1),
      ledger: z.number().int().optional(),
      payload: z.record(z.unknown()).default({}),
      strict: z.boolean().optional(),
    });
    const body = schema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    try {
      assertIngestableType(body.data.type, body.data.strict ?? true);
    } catch (err) {
      if (err instanceof IndexerValidationError) {
        return reply.status(400).send({ error: err.message });
      }
      throw err;
    }

    const { strict: _strict, ...event } = body.data;
    const created = await ingestChainEvent(event);
    return reply.status(201).send(created);
  });

  app.get<{ Querystring: { limit?: string; type?: string } }>("/events", async (req) => {
    return listChainEvents(clampLimit(req.query.limit, 50, 200), req.query.type);
  });
}
