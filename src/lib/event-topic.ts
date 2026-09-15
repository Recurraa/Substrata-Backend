/** Normalize Soroban event topic values into plain strings. */
export function topicSymbol(topic: unknown): string | null {
  if (typeof topic === "string") return topic;
  if (topic && typeof topic === "object") {
    const t = topic as { _value?: string; value?: string; sym?: string };
    return t._value ?? t.value ?? t.sym ?? null;
  }
  return null;
}
