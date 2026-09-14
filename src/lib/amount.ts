/** Convert decimal amount string to stroops-like integer string for display/math helpers. */
export function parseAmount(amount: string): number {
  const n = Number(amount);
  if (!Number.isFinite(n) || n < 0) throw new Error(`Invalid amount: ${amount}`);
  return n;
}

export function sumAmounts(amounts: string[]): string {
  const total = amounts.reduce((acc, a) => acc + parseAmount(a), 0);
  return total.toFixed(7).replace(/\.?0+$/, "");
}
