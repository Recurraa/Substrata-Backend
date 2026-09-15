import { describe, expect, it } from "vitest";
import { assertIngestableType } from "../src/services/indexer.validators";
import { IndexerValidationError } from "../src/lib/indexer-errors";

describe("assertIngestableType", () => {
  it("allows unknown types when not strict", () => {
    expect(() => assertIngestableType("custom_topic", false)).not.toThrow();
  });

  it("rejects unknown types when strict", () => {
    expect(() => assertIngestableType("custom_topic", true)).toThrow(IndexerValidationError);
  });

  it("accepts known plan lifecycle topics", () => {
    expect(() => assertIngestableType("plan_deactivated", true)).not.toThrow();
    expect(() => assertIngestableType("plan_reactivated", true)).not.toThrow();
  });
});
