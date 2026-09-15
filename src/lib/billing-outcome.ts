/**
 * Normalize scValToNative enum shapes into Paid | Failed.
 * Kept free of Prisma/config imports so unit tests stay offline-friendly.
 */
export function parseBillingOutcome(result: unknown): "Paid" | "Failed" | null {
  if (result === "Paid" || result === "Failed") return result;
  if (result && typeof result === "object") {
    const tag =
      (result as { tag?: string; _tag?: string }).tag ??
      (result as { _tag?: string })._tag;
    if (tag === "Paid" || tag === "Failed") return tag;
    // Some SDK versions return { Paid: void } / { Failed: void }
    if ("Paid" in (result as object)) return "Paid";
    if ("Failed" in (result as object)) return "Failed";
  }
  return null;
}
