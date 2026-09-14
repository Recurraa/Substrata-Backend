export function billingIdempotencyKey(subscriptionId: string, periodEnd: Date): string {
  return `${subscriptionId}:${periodEnd.toISOString()}`;
}
