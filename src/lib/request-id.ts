import { randomUUID } from "crypto";

export function newRequestId(): string {
  return randomUUID();
}
