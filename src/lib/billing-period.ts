import { BillingInterval } from "@prisma/client";
import { addDays, addWeeks, addMonths, addYears } from "./date-utils";

/**
 * Advance a subscription's billing period by one interval.
 */
export function nextPeriod(
  from: Date,
  interval: BillingInterval,
  count = 1
): Date {
  switch (interval) {
    case "DAILY":
      return addDays(from, count);
    case "WEEKLY":
      return addWeeks(from, count);
    case "MONTHLY":
      return addMonths(from, count);
    case "YEARLY":
      return addYears(from, count);
  }
}
