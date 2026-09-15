import { isKnownChainEventType } from "../lib/chain-event-types";
import { IndexerValidationError } from "../lib/indexer-errors";

export function assertIngestableType(type: string, strict = false) {
  if (strict && !isKnownChainEventType(type)) {
    throw new IndexerValidationError(`Unknown chain event type: ${type}`);
  }
}
