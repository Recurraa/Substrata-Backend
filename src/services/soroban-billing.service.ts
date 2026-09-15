/**
 * On-chain billing via Sorobill Soroban execute_billing.
 */
import { config } from "../config";
import { logger } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { PaymentStatus } from "@prisma/client";
import {
  addressToScVal,
  hasSorobanContract,
  invokeAsAdmin,
  u64ToScVal,
} from "../lib/soroban";
import { parseBillingOutcome } from "../lib/billing-outcome";
import { Keypair } from "@stellar/stellar-sdk";

export { parseBillingOutcome } from "../lib/billing-outcome";

export interface SorobanBillingParams {
  paymentId: string;
  subscriberAddress: string;
  contractPlanId: number;
  idempotencyKey: string;
}

export class SorobanBillingFailedError extends Error {
  readonly txHash: string;

  constructor(txHash: string, message = "Soroban billing returned Failed") {
    super(message);
    this.name = "SorobanBillingFailedError";
    this.txHash = txHash;
  }
}

/**
 * Trigger execute_billing on the Sorobill contract.
 * Admin (treasury) must match the contract's initialized admin.
 *
 * Important: the contract returns Ok(BillingOutcome::Failed) when balance/allowance
 * is insufficient so storage (failed_attempts / grace) can commit. That is not a
 * successful payment — callers must treat Failed as a billing failure.
 */
export async function executeSorobanBilling(
  params: SorobanBillingParams
): Promise<string> {
  const { paymentId, subscriberAddress, contractPlanId, idempotencyKey } = params;

  const existing = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { stellarTxHash: true, status: true },
  });
  if (existing?.stellarTxHash && existing.status === PaymentStatus.SUCCESS) {
    return existing.stellarTxHash;
  }

  if (!hasSorobanContract()) {
    throw new Error("SUBSCRIPTION_CONTRACT_ID not set");
  }

  if (config.billing.testMode) {
    const mockHash = `soroban_test_${idempotencyKey}`;
    logger.info({ paymentId, mockHash }, "TEST MODE: skipping Soroban execute_billing");
    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.SUCCESS, stellarTxHash: mockHash },
    });
    return mockHash;
  }

  const admin = Keypair.fromSecret(config.stellar.treasurySecretKey).publicKey();

  await prisma.payment.update({
    where: { id: paymentId },
    data: { status: PaymentStatus.PROCESSING },
  });

  try {
    const { hash, result } = await invokeAsAdmin("execute_billing", [
      addressToScVal(admin),
      addressToScVal(subscriberAddress),
      u64ToScVal(contractPlanId),
    ]);

    const outcome = parseBillingOutcome(result);

    if (outcome === "Failed") {
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.FAILED,
          stellarTxHash: hash,
          failureReason: "BillingOutcome::Failed (insufficient balance or allowance)",
        },
      });
      throw new SorobanBillingFailedError(hash);
    }

    if (outcome !== "Paid" && outcome !== null) {
      logger.warn({ paymentId, result }, "Unexpected BillingOutcome shape; treating as Paid");
    }

    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.SUCCESS, stellarTxHash: hash },
    });

    logger.info({ paymentId, hash, contractPlanId, outcome }, "Soroban billing succeeded");
    return hash;
  } catch (err) {
    if (err instanceof SorobanBillingFailedError) throw err;

    const message = err instanceof Error ? err.message : String(err);
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.FAILED,
        failureReason: message.slice(0, 500),
      },
    });
    throw err;
  }
}
