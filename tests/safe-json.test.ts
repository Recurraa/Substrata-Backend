import { describe, expect, it } from "vitest";
import { safeJsonParse } from "../src/lib/safe-json";

describe("safeJsonParse", () => {
  it("parses valid json", () => {
    expect(safeJsonParse('{"a":1}', {})).toEqual({ a: 1 });
  });
  it("returns fallback on invalid json", () => {
    expect(safeJsonParse("nope", { ok: false })).toEqual({ ok: false });
  });
});
