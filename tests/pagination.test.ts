import { describe, it, expect } from "vitest";
import { clampLimit } from "../src/lib/pagination";

describe("clampLimit", () => {
  it("uses fallback for invalid values", () => {
    expect(clampLimit(undefined)).toBe(50);
    expect(clampLimit("nope")).toBe(50);
  });

  it("caps at max", () => {
    expect(clampLimit(500)).toBe(100);
  });
});
