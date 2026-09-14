import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { getRedis } from "../lib/redis";
import { pingSoroban, hasSorobanContract } from "../lib/soroban";
import { config } from "../config";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async (_req, reply) => {
    const checks: Record<string, string> = {
      api: "ok",
    };

    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = "ok";
    } catch {
      checks.database = "error";
    }

    try {
      const redis = getRedis();
      const pong = await redis.ping();
      checks.redis = pong === "PONG" ? "ok" : "error";
    } catch {
      checks.redis = "error";
    }

    if (hasSorobanContract()) {
      checks.soroban = (await pingSoroban()) ? "ok" : "error";
      checks.contract = config.stellar.subscriptionContractId ? "configured" : "missing";
    } else {
      checks.soroban = "skipped";
      checks.contract = "unconfigured";
    }

    const healthy =
      checks.database === "ok" &&
      checks.redis === "ok" &&
      checks.soroban !== "error";

    return reply.status(healthy ? 200 : 503).send({
      status: healthy ? "ok" : "degraded",
      ts: new Date().toISOString(),
      checks,
    });
  });

  app.get("/health/live", async () => ({ status: "ok" }));
}
