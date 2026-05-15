import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { verifySignedMessage } from "../../services/payment.service";

const verifySchema = z.object({
  address: z.string().length(56),
  message: z.string().min(1),
  signature: z.string().min(1),
});

export async function walletsRoutes(app: FastifyInstance) {
  /**
   * Verify a signed message to authenticate a Stellar wallet.
   * The client signs a challenge string with their secret key;
   * we verify the signature against their public key.
   */
  app.post("/verify", async (req, reply) => {
    const body = verifySchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const { address, message, signature } = body.data;
    const valid = verifySignedMessage(address, message, signature);

    if (!valid) return reply.status(401).send({ error: "Invalid signature" });

    // Mark wallet as verified
    const wallet = await prisma.wallet.upsert({
      where: { address },
      create: { address, isVerified: true },
      update: { isVerified: true },
    });

    return { verified: true, walletId: wallet.id };
  });

  // Get wallet info + subscriptions
  app.get<{ Params: { address: string } }>("/:address", async (req, reply) => {
    const wallet = await prisma.wallet.findUnique({
      where: { address: req.params.address },
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!wallet) return reply.status(404).send({ error: "Wallet not found" });
    return wallet;
  });
}
