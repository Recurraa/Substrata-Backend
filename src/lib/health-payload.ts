import { API_VERSION } from "./version";

export function buildHealthPayload(ok: boolean, details: Record<string, unknown> = {}) {
  return {
    ok,
    version: API_VERSION,
    ...details,
  };
}
