import { BillingInterval, PaymentStatus, SubscriptionStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { config } from "../config";
import { submitPayment } from "./payment.service";
import { emitWebhookEvent } from "./webhook.service";
import { billingIdempotencyKey } from "../lib/idempotency";
import { nextPeriod } from "../lib/billing-period";

export { nextPeriod };

/**
 * Find all subscriptions due for billing right now.
 */
export async function findDueSubscriptions() {
  return prisma.subscription.findMany({
    where: {
      status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE] },
      currentPeriodEnd: { lte: new Date() },
      cancelAtPeriodEnd: false,
      paused: false,
    },
    include: { plan: true, wallet: true },
  });
}

/**
 * Process a single subscription billing cycle.
 * Idempotent — creates payment with unique idempotency key per period.
 */
export async function processBillingCycle(subscriptionId: string): Promise<void> {
  const sub = await prisma.subscription.findUniqueOrThrow({
    where: { id: subscriptionId },
    include: { plan: true, wallet: true },
  });

  if (
    sub.status === SubscriptionStatus.CANCELLED ||
    sub.status === SubscriptionStatus.EXPIRED
  ) {
    return;
  }

  const idempotencyKey = billingIdempotencyKey(sub.id, sub.currentPeriodEnd);

  // Avoid duplicate payments for the same period
  const existing = await prisma.payment.findUnique({ where: { idempotencyKey } });
  if (existing?.status === PaymentStatus.SUCCESS) {
    await advancePeriod(sub);
    return;
  }

  const payment = existing ?? (await prisma.payment.create({
    data: {
      subscriptionId: sub.id,
      amount: sub.plan.amount,
      assetCode: sub.plan.assetCode,
      assetIssuer: sub.plan.assetIssuer,
      idempotencyKey,
      billingPeriodStart: sub.currentPeriodStart,
      billingPeriodEnd: sub.currentPeriodEnd,
      testMode: config.billing.testMode,
    },
  }));

  try {
    const useSoroban =
      config.billing.useSorobanBilling &&
      Boolean(config.stellar.subscriptionContractId) &&
      sub.plan.contractPlanId != null;

    if (useSoroban) {
      const { executeSorobanBilling } = await import("./soroban-billing.service");
      await executeSorobanBilling({
        paymentId: payment.id,
        subscriberAddress: sub.wallet.address,
        contractPlanId: sub.plan.contractPlanId!,
        idempotencyKey,
      });
    } else if (config.billing.testMode) {
      // Classic Horizon cannot pull from a subscriber wallet (no secret).
      // In test mode we record a simulated success without sending funds.
      await submitPayment({
        paymentId: payment.id,
        fromSecret: config.stellar.treasurySecretKey,
        toAddress: sub.plan.merchantAddress,
        amount: sub.plan.amount,
        assetCode: sub.plan.assetCode,
        assetIssuer: sub.plan.assetIssuer,
        idempotencyKey,
      });
    } else {
      throw new Error(
        "Live billing requires Soroban (USE_SOROBAN_BILLING + contractPlanId). " +
          "Horizon push-to-subscriber is not a valid subscription collection path."
      );
    }

    await advancePeriod(sub);
    await emitWebhookEvent("PAYMENT_SUCCESS", payment.id, {
      subscriptionId: sub.id,
      amount: sub.plan.amount,
      assetCode: sub.plan.assetCode,
      mode: useSoroban ? "soroban" : "horizon",
    });
  } catch (err) {
    await handlePaymentFailure(sub, payment.id);
  }
}

async function advancePeriod(sub: {
  id: string;
  currentPeriodEnd: Date;
  plan: { interval: BillingInterval; intervalCount: number };
  cancelAtPeriodEnd: boolean;
}) {
  const newStart = sub.currentPeriodEnd;
  const newEnd = nextPeriod(newStart, sub.plan.interval, sub.plan.intervalCount);

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: newStart,
      currentPeriodEnd: newEnd,
      retryCount: 0,
      gracePeriodEndsAt: null,
    },
  });
}

async function handlePaymentFailure(
  sub: { id: string; retryCount: number },
  paymentId: string
) {
  const retryCount = sub.retryCount + 1;
  const maxRetries = config.billing.maxRetries;

  if (retryCount >= maxRetries) {
    // Exceeded retries — enter grace period or cancel
    const gracePeriodEndsAt = new Date(
      Date.now() + config.billing.gracePeriodHours * 60 * 60 * 1000
    );

    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: SubscriptionStatus.PAST_DUE,
        retryCount,
        gracePeriodEndsAt,
      },
    });

    await emitWebhookEvent("PAYMENT_FAILED", paymentId, {
      subscriptionId: sub.id,
      retryCount,
      gracePeriodEndsAt,
    });

    logger.warn({ subscriptionId: sub.id, retryCount }, "Subscription past due");
  } else {
    // Exponential backoff: 2^retryCount hours
    const backoffMs = Math.pow(2, retryCount) * 60 * 60 * 1000;
    const nextRetryAt = new Date(Date.now() + backoffMs);

    await prisma.payment.updateMany({
      where: { subscriptionId: sub.id, status: PaymentStatus.FAILED },
      data: { status: PaymentStatus.RETRYING, nextRetryAt, retryCount },
    });

    await prisma.subscription.update({
      where: { id: sub.id },
      data: { retryCount },
    });

    logger.info({ subscriptionId: sub.id, nextRetryAt }, "Scheduled payment retry");
  }
}

/**
 * Cancel subscriptions whose grace period has expired.
 */
export async function expireGracePeriods(): Promise<void> {
  const expired = await prisma.subscription.findMany({
    where: {
      status: SubscriptionStatus.PAST_DUE,
      gracePeriodEndsAt: { lte: new Date() },
    },
  });

  for (const sub of expired) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: SubscriptionStatus.CANCELLED, cancelledAt: new Date() },
    });

    await emitWebhookEvent("SUBSCRIPTION_CANCELLED", null, {
      subscriptionId: sub.id,
      reason: "grace_period_expired",
    });

    logger.info({ subscriptionId: sub.id }, "Subscription cancelled after grace period");
  }
}
