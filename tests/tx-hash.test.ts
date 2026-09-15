import { describe, expect, it } from "vitest";
import { normalizeTxHash } from "../src/lib/tx-hash";

describe("normalizeTxHash", () => {
  it("trims and lowercases", () => {
    expect(normalizeTxHash("  AbC  ")).toBe("abc");
  });
});
