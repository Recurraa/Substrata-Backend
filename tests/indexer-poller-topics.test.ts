import { describe, expect, it } from "vitest";
import { topicSymbol } from "../src/lib/event-topic";

describe("topicSymbol", () => {
  it("extracts string topics", () => {
    expect(topicSymbol("plan_created")).toBe("plan_created");
  });

  it("extracts object-shaped symbols", () => {
    expect(topicSymbol({ _value: "payment_failed" })).toBe("payment_failed");
    expect(topicSymbol({ value: "subscribed" })).toBe("subscribed");
  });

  it("returns null for unknowns", () => {
    expect(topicSymbol(null)).toBeNull();
    expect(topicSymbol(42)).toBeNull();
  });
});
