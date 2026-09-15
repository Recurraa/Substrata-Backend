/**
 * Map internal webhook event types to Stripe-shaped names for integrators.
 */
export type StripeLikeEvent =
  | "invoice.paid"
  | "invoice.payment_failed"
  | "customer.subscription.created"
  | "customer.subscription.updated"
  | "customer.subscription.deleted";

const MAP: Record<string, StripeLikeEvent> = {
  PAYMENT_SUCCESS: "invoice.paid",
  PAYMENT_FAILED: "invoice.payment_failed",
  SUBSCRIPTION_CREATED: "customer.subscription.created",
  SUBSCRIPTION_UPDATED: "customer.subscription.updated",
  SUBSCRIPTION_CANCELLED: "customer.subscription.deleted",
};

export function toStripeLikeType(internal: string): StripeLikeEvent | string {
  return MAP[internal] ?? internal.toLowerCase().replace(/_/g, ".");
}

export function buildStripeLikePayload(
  type: string,
  id: string,
  createdAt: Date,
  data: Record<string, unknown>
) {
  return {
    id: `evt_${id}`,
    object: "event",
    type: toStripeLikeType(type),
    created: Math.floor(createdAt.getTime() / 1000),
    data: { object: data },
    livemode: false,
  };
}
