import { describe, expect, it } from "vitest";
import { parseBillingOutcome } from "../src/services/soroban-billing.service";

describe("parseBillingOutcome", () => {
  it("parses string variants", () => {
    expect(parseBillingOutcome("Paid")).toBe("Paid");
    expect(parseBillingOutcome("Failed")).toBe("Failed");
  });

  it("parses tag objects", () => {
    expect(parseBillingOutcome({ tag: "Paid" })).toBe("Paid");
    expect(parseBillingOutcome({ tag: "Failed" })).toBe("Failed");
  });

  it("parses keyed enum objects", () => {
    expect(parseBillingOutcome({ Paid: null })).toBe("Paid");
    expect(parseBillingOutcome({ Failed: null })).toBe("Failed");
  });

  it("returns null for unknown shapes", () => {
    expect(parseBillingOutcome(null)).toBeNull();
    expect(parseBillingOutcome({})).toBeNull();
    expect(parseBillingOutcome(42)).toBeNull();
  });
});
