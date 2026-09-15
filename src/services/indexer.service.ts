/**
 * Ingest and list on-chain billing events mirrored into Postgres.
 */
import { prisma } from "../lib/prisma";
import { normalizeTxHash } from "../lib/tx-hash";
import { asInputJson } from "../lib/json";

export interface IngestEventInput {
  type: string;
  contractId: string;
  txHash: string;
  ledger?: number;
  payload: Record<string, unknown>;
}

export async function ingestChainEvent(input: IngestEventInput) {
  const payload = asInputJson(input.payload) ?? {};
  return prisma.chainEvent.upsert({
    where: { txHash: normalizeTxHash(input.txHash) },
    create: {
      type: input.type,
      contractId: input.contractId,
      txHash: normalizeTxHash(input.txHash),
      ledger: input.ledger,
      payload,
    },
    update: {
      type: input.type,
      payload,
      ledger: input.ledger,
    },
  });
}

export async function listChainEvents(limit = 50, type?: string) {
  return prisma.chainEvent.findMany({
    where: type ? { type } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
