/**
 * Minimal Soroban event poller — pulls contract events from RPC and upserts ChainEvent rows.
 */
import { rpc } from "@stellar/stellar-sdk";
import { config } from "../config";
import { logger } from "../lib/logger";
import { getServer, hasSorobanContract } from "../lib/soroban";
import { isKnownChainEventType } from "../lib/chain-event-types";
import { topicSymbol } from "../lib/event-topic";
import { ingestChainEvent } from "./indexer.service";

export interface PollResult {
  polled: boolean;
  ingested: number;
  latestLedger?: number;
  reason?: string;
}

/**
 * Poll recent contract events starting at `startLedger` (or latest-50 when omitted).
 * Safe to call from a cron / authenticated admin route.
 */
export async function pollSorobanEvents(startLedger?: number): Promise<PollResult> {
  if (!hasSorobanContract()) {
    return { polled: false, ingested: 0, reason: "SUBSCRIPTION_CONTRACT_ID not set" };
  }

  if (config.billing.testMode) {
    return { polled: false, ingested: 0, reason: "TEST_MODE skips RPC polling" };
  }

  const server = getServer();
  const contractId = config.stellar.subscriptionContractId;

  let fromLedger = startLedger;
  if (fromLedger == null) {
    try {
      const latest = await server.getLatestLedger();
      fromLedger = Math.max(1, latest.sequence - 50);
    } catch (err) {
      logger.warn({ err }, "Failed to read latest ledger for poller");
      return { polled: false, ingested: 0, reason: "getLatestLedger failed" };
    }
  }

  let response: rpc.Api.GetEventsResponse;
  try {
    response = await server.getEvents({
      startLedger: fromLedger,
      filters: [
        {
          type: "contract",
          contractIds: [contractId],
        },
      ],
      limit: 100,
    });
  } catch (err) {
    logger.warn({ err, fromLedger }, "Soroban getEvents failed");
    return { polled: false, ingested: 0, reason: "getEvents failed" };
  }

  let ingested = 0;
  for (const ev of response.events ?? []) {
    const topics = (ev.topic ?? []) as unknown[];
    const type = topicSymbol(topics[0]) ?? "unknown";
    if (!isKnownChainEventType(type) && type === "unknown") continue;

    const txHash = ev.txHash;
    if (!txHash) continue;

    await ingestChainEvent({
      type,
      contractId,
      txHash,
      ledger: typeof ev.ledger === "number" ? ev.ledger : undefined,
      payload: {
        topics: topics.map((t) => topicSymbol(t) ?? String(t)),
        value: ev.value !== undefined ? String(ev.value) : null,
      },
    });
    ingested += 1;
  }

  const latestLedger =
    response.events && response.events.length
      ? Math.max(...response.events.map((e) => (typeof e.ledger === "number" ? e.ledger : 0)))
      : fromLedger;

  logger.info({ ingested, fromLedger, latestLedger }, "Indexer poll complete");
  return { polled: true, ingested, latestLedger };
}
