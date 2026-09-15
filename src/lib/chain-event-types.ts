/** Known on-chain event topic names mirrored from the Sorobill contract. */
export const CHAIN_EVENT_TYPES = [
  "plan_created",
  "plan_updated",
  "plan_deactivated",
  "plan_reactivated",
  "subscribed",
  "sub_cancelled",
  "sub_paused",
  "sub_resumed",
  "payment_executed",
  "payment_failed",
] as const;

export type ChainEventType = (typeof CHAIN_EVENT_TYPES)[number];

export function isKnownChainEventType(type: string): type is ChainEventType {
  return (CHAIN_EVENT_TYPES as readonly string[]).includes(type);
}
