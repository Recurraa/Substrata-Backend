export function clampLimit(limit: unknown, fallback = 50, max = 100): number {
  const n = typeof limit === "string" ? parseInt(limit, 10) : Number(limit);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), max);
}
