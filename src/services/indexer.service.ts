/**
 * Ingest and list on-chain billing events mirrored into Postgres.
 */
import { prisma } from "../lib/prisma";
import { normalizeTxHash } from "../lib/tx-hash";

export interface IngestEventInput {
  type: string;
  contractId: string;
  txHash: string;
  ledger?: number;
  payload: Record<string, unknown>;
}

export async function ingestChainEvent(input: IngestEventInput) {
  return prisma.chainEvent.upsert({
    where: { txHash: normalizeTxHash(input.txHash) },
    create: {
      type: input.type,
      contractId: input.contractId,
      txHash: normalizeTxHash(input.txHash),
      ledger: input.ledger,
      payload: input.payload,
    },
    update: {
      type: input.type,
      payload: input.payload,
      ledger: input.ledger,
    },
  });
}

export async function listChainEvents(limit = 50) {
  return prisma.chainEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
