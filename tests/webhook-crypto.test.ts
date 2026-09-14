import { describe, it, expect } from "vitest";
import { signWebhookPayload, verifyWebhookSignature } from "../src/lib/webhook-crypto";

describe("webhook-crypto", () => {
  it("signs deterministically", () => {
    const sig = signWebhookPayload("secret", '{"a":1}');
    expect(sig).toHaveLength(64);
    expect(signWebhookPayload("secret", '{"a":1}')).toBe(sig);
  });

  it("verifies valid signatures", () => {
    const body = JSON.stringify({ type: "PAYMENT_SUCCESS" });
    const sig = signWebhookPayload("whsec_test", body);
    expect(verifyWebhookSignature("whsec_test", body, sig)).toBe(true);
  });

  it("rejects tampered signatures", () => {
    const body = "{}";
    const sig = signWebhookPayload("whsec_test", body);
    expect(verifyWebhookSignature("whsec_test", body, sig + "ff")).toBe(false);
    expect(verifyWebhookSignature("other", body, sig)).toBe(false);
  });
});
