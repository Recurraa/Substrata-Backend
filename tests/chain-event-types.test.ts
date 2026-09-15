import { describe, expect, it } from "vitest";
import { isKnownChainEventType } from "../src/lib/chain-event-types";

describe("chain-event-types", () => {
  it("accepts known topics", () => {
    expect(isKnownChainEventType("payment_executed")).toBe(true);
  });
  it("rejects unknown topics", () => {
    expect(isKnownChainEventType("nope")).toBe(false);
  });
});
