import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { logger } from "./lib/logger";
import { plansRoutes } from "./routes/plans";
import { subscriptionsRoutes } from "./routes/subscriptions";
import { paymentsRoutes } from "./routes/payments";
import { webhooksRoutes } from "./routes/webhooks";
import { walletsRoutes } from "./routes/wallets";
import { healthRoutes } from "./routes/health";
import { merchantsRoutes } from "./routes/merchants";
import { billingRoutes } from "./routes/billing";
import { statsRoutes } from "./routes/stats";

export async function buildApp() {
  const app = Fastify({ logger });

  await app.register(helmet);
  await app.register(cors, { origin: true });
  await app.register(rateLimit, { max: 200, timeWindow: "1 minute" });

  await app.register(healthRoutes);

  await app.register(plansRoutes, { prefix: "/api/v1/plans" });
  await app.register(merchantsRoutes, { prefix: "/api/v1/merchants" });
  await app.register(billingRoutes, { prefix: "/api/v1/billing" });
  await app.register(statsRoutes, { prefix: "/api/v1/stats" });
  await app.register(subscriptionsRoutes, { prefix: "/api/v1/subscriptions" });
  await app.register(paymentsRoutes, { prefix: "/api/v1/payments" });
  await app.register(webhooksRoutes, { prefix: "/api/v1/webhooks" });
  await app.register(walletsRoutes, { prefix: "/api/v1/wallets" });

  return app;
}
