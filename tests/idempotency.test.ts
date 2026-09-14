import { describe, it, expect } from "vitest";
import { billingIdempotencyKey } from "../src/lib/idempotency";

describe("billingIdempotencyKey", () => {
  it("includes subscription id and period end", () => {
    const key = billingIdempotencyKey("sub_1", new Date("2026-01-01T00:00:00.000Z"));
    expect(key).toBe("sub_1:2026-01-01T00:00:00.000Z");
  });
});
