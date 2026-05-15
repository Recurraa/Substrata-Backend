import {
  Horizon,
  Keypair,
  Networks,
  TransactionBuilder,
  Operation,
  Asset,
  BASE_FEE,
  Memo,
} from "@stellar/stellar-sdk";
import { config } from "../config";
import { logger } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { PaymentStatus } from "@prisma/client";

const server = new Horizon.Server(config.stellar.horizonUrl);

function getAsset(code: string, issuer?: string | null): Asset {
  return code === "XLM" ? Asset.native() : new Asset(code, issuer!);
}

export interface PaymentParams {
  paymentId: string;
  fromSecret: string;
  toAddress: string;
  amount: string;
  assetCode: string;
  assetIssuer?: string | null;
  idempotencyKey: string;
}

/**
 * Submit a Stellar payment. Idempotent — checks for existing tx hash first.
 */
export async function submitPayment(params: PaymentParams): Promise<string> {
  const { paymentId, fromSecret, toAddress, amount, assetCode, assetIssuer, idempotencyKey } =
    params;

  // Idempotency: if already submitted, return existing hash
  const existing = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { stellarTxHash: true, status: true },
  });
  if (existing?.stellarTxHash && existing.status === PaymentStatus.SUCCESS) {
    return existing.stellarTxHash;
  }

  if (config.billing.testMode) {
    const mockHash = `test_${idempotencyKey}`;
    logger.info({ paymentId, mockHash }, "TEST MODE: skipping real transaction");
    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.SUCCESS, stellarTxHash: mockHash },
    });
    return mockHash;
  }

  const keypair = Keypair.fromSecret(fromSecret);
  const account = await server.loadAccount(keypair.publicKey());
  const asset = getAsset(assetCode, assetIssuer);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: config.stellar.networkPassphrase,
  })
    .addOperation(
      Operation.payment({ destination: toAddress, asset, amount })
    )
    .addMemo(Memo.text(idempotencyKey.slice(0, 28))) // max 28 bytes
    .setTimeout(30)
    .build();

  tx.sign(keypair);

  await prisma.payment.update({
    where: { id: paymentId },
    data: { status: PaymentStatus.PROCESSING },
  });

  try {
    const result = await server.submitTransaction(tx);
    const hash = result.hash;
    const ledger =
      typeof result.ledger === "number" ? result.ledger : undefined;

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.SUCCESS,
        stellarTxHash: hash,
        stellarLedger: ledger,
        failureReason: null,
      },
    });

    logger.info({ paymentId, hash }, "Payment submitted successfully");
    return hash;
  } catch (err: any) {
    const reason = err?.response?.data?.extras?.result_codes
      ? JSON.stringify(err.response.data.extras.result_codes)
      : String(err);

    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.FAILED, failureReason: reason },
    });

    logger.error({ paymentId, reason }, "Payment submission failed");
    throw err;
  }
}

/**
 * Verify a signed message from a Stellar keypair (wallet auth).
 */
export function verifySignedMessage(
  publicKey: string,
  message: string,
  signature: string
): boolean {
  try {
    const keypair = Keypair.fromPublicKey(publicKey);
    const msgBuffer = Buffer.from(message, "utf8");
    const sigBuffer = Buffer.from(signature, "base64");
    return keypair.verify(msgBuffer, sigBuffer);
  } catch {
    return false;
  }
}
