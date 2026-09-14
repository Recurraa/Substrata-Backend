import { describe, it, expect } from "vitest";
import { nextPeriod } from "../src/services/billing.service";

describe("nextPeriod", () => {
  const from = new Date("2026-03-01T00:00:00.000Z");

  it("advances daily", () => {
    expect(nextPeriod(from, "DAILY", 3).getUTCDate()).toBe(4);
  });

  it("advances monthly", () => {
    expect(nextPeriod(from, "MONTHLY", 1).getUTCMonth()).toBe(3);
  });

  it("advances yearly", () => {
    expect(nextPeriod(from, "YEARLY", 1).getUTCFullYear()).toBe(2027);
  });
});
