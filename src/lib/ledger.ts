export function isValidLedger(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 0;
}
