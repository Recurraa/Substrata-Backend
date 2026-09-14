import { describe, it, expect } from "vitest";
import { addDays, addWeeks, addMonths, addYears } from "../src/lib/date-utils";

describe("date-utils", () => {
  const base = new Date("2026-01-15T12:00:00.000Z");

  it("adds days", () => {
    expect(addDays(base, 2).toISOString()).toBe("2026-01-17T12:00:00.000Z");
  });

  it("adds weeks", () => {
    expect(addWeeks(base, 1).toISOString()).toBe("2026-01-22T12:00:00.000Z");
  });

  it("adds months", () => {
    expect(addMonths(base, 1).getUTCMonth()).toBe(1);
  });

  it("adds years", () => {
    expect(addYears(base, 1).getUTCFullYear()).toBe(2027);
  });
});
