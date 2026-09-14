/**
 * Soroban RPC helpers for invoking the Substrata subscription contract.
 */
import {
  Contract,
  Keypair,
  TransactionBuilder,
  rpc,
  xdr,
  nativeToScVal,
  scValToNative,
  Address,
} from "@stellar/stellar-sdk";
import { config } from "../config";
import { logger } from "./logger";
import { networkPassphrase } from "./stellar-network";

const passphrase = networkPassphrase();

export function getServer(): rpc.Server {
  return new rpc.Server(config.stellar.sorobanRpcUrl, { allowHttp: true });
}

export function getContract(): Contract {
  const id = config.stellar.subscriptionContractId;
  if (!id) {
    throw new Error("SUBSCRIPTION_CONTRACT_ID is not configured");
  }
  return new Contract(id);
}

export function hasSorobanContract(): boolean {
  return Boolean(config.stellar.subscriptionContractId);
}

/**
 * Simulate + assemble + sign + send a contract invocation as the treasury admin.
 */
export async function invokeAsAdmin(
  method: string,
  args: xdr.ScVal[]
): Promise<{ hash: string; result: unknown }> {
  const secret = config.stellar.treasurySecretKey;
  if (!secret) {
    throw new Error("STELLAR_TREASURY_SECRET_KEY is required for Soroban invokes");
  }

  const server = getServer();
  const keypair = Keypair.fromSecret(secret);
  const account = await server.getAccount(keypair.publicKey());
  const contract = getContract();

  const tx = new TransactionBuilder(account, {
    fee: "100000",
    networkPassphrase: passphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();

  const simulated = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simulated)) {
    logger.error({ err: simulated.error, method }, "Soroban simulation failed");
    throw new Error(`Soroban simulation failed: ${simulated.error}`);
  }

  const prepared = rpc.assembleTransaction(tx, simulated).build();
  prepared.sign(keypair);

  const send = await server.sendTransaction(prepared);
  if (send.status === "ERROR") {
    throw new Error(`Soroban submit error: ${JSON.stringify(send)}`);
  }

  // Poll until success / failure
  let status = await server.getTransaction(send.hash);
  const started = Date.now();
  while (status.status === rpc.Api.GetTransactionStatus.NOT_FOUND) {
    if (Date.now() - started > 60_000) {
      throw new Error(`Timed out waiting for tx ${send.hash}`);
    }
    await new Promise((r) => setTimeout(r, 1500));
    status = await server.getTransaction(send.hash);
  }

  if (status.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    throw new Error(`Soroban tx failed: ${send.hash}`);
  }

  const result =
    status.returnValue !== undefined
      ? scValToNative(status.returnValue)
      : null;

  return { hash: send.hash, result };
}

export function addressToScVal(address: string): xdr.ScVal {
  return Address.fromString(address).toScVal();
}

export function u64ToScVal(n: number | bigint): xdr.ScVal {
  return nativeToScVal(typeof n === "bigint" ? n : BigInt(n), { type: "u64" });
}

export function i128ToScVal(n: bigint | string | number): xdr.ScVal {
  const v = typeof n === "bigint" ? n : BigInt(n);
  return nativeToScVal(v, { type: "i128" });
}

export async function pingSoroban(): Promise<boolean> {
  try {
    const health = await getServer().getHealth();
    return health.status === "healthy";
  } catch {
    return false;
  }
}
