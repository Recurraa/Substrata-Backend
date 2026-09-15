import type { Prisma } from "@prisma/client";

/** Cast loose JSON objects into Prisma InputJsonValue safely. */
export function asInputJson(
  value: Record<string, unknown> | undefined | null
): Prisma.InputJsonValue | undefined {
  if (value == null) return undefined;
  return value as Prisma.InputJsonValue;
}
