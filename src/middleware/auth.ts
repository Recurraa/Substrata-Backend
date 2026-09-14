import { FastifyRequest, FastifyReply } from "fastify";
import { verifySignedMessage } from "../services/payment.service";
import { prisma } from "../lib/prisma";

/**
 * Optional wallet auth via headers:
 *   x-stellar-address
 *   x-stellar-message
 *   x-stellar-signature (base64)
 *
 * In development, auth is skipped when headers are absent.
 */
export async function requireWalletAuth(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const address = req.headers["x-stellar-address"];
  const message = req.headers["x-stellar-message"];
  const signature = req.headers["x-stellar-signature"];

  if (!address || !message || !signature) {
    if (process.env.NODE_ENV === "production") {
      reply.status(401).send({ error: "Wallet auth headers required" });
      return;
    }
    return; // allow unauthenticated in non-production
  }

  if (typeof address !== "string" || typeof message !== "string" || typeof signature !== "string") {
    reply.status(400).send({ error: "Invalid auth headers" });
    return;
  }

  const valid = verifySignedMessage(address, message, signature);
  if (!valid) {
    reply.status(401).send({ error: "Invalid wallet signature" });
    return;
  }

  await prisma.wallet.upsert({
    where: { address },
    create: { address, isVerified: true },
    update: { isVerified: true },
  });

  (req as FastifyRequest & { walletAddress?: string }).walletAddress = address;
}
