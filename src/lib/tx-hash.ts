/** Normalize Stellar tx hashes for storage uniqueness. */
export function normalizeTxHash(hash: string): string {
  return hash.trim().toLowerCase();
}
