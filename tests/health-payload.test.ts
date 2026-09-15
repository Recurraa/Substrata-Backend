import { describe, expect, it } from "vitest";
import { buildHealthPayload } from "../src/lib/health-payload";

describe("buildHealthPayload", () => {
  it("includes api version", () => {
    expect(buildHealthPayload(true).version).toBe("0.3.0");
  });
});
