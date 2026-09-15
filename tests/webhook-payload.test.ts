import { describe, expect, it } from "vitest";
import { buildStripeLikePayload, toStripeLikeType } from "../src/lib/webhook-payload";

describe("webhook-payload", () => {
  it("maps internal types to Stripe-like names", () => {
    expect(toStripeLikeType("PAYMENT_SUCCESS")).toBe("invoice.paid");
    expect(toStripeLikeType("SUBSCRIPTION_CANCELLED")).toBe(
      "customer.subscription.deleted"
    );
  });

  it("builds Stripe-shaped envelopes", () => {
    const created = new Date("2026-01-01T00:00:00Z");
    const evt = buildStripeLikePayload("PAYMENT_SUCCESS", "abc", created, {
      amount: "10",
    });
    expect(evt.id).toBe("evt_abc");
    expect(evt.object).toBe("event");
    expect(evt.type).toBe("invoice.paid");
    expect(evt.created).toBe(Math.floor(created.getTime() / 1000));
    expect(evt.data.object).toEqual({ amount: "10" });
  });
});
