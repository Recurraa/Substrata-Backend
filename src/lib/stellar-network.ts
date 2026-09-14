import { Networks } from "@stellar/stellar-sdk";
import { config } from "../config";

export function networkPassphrase(): string {
  return config.stellar.network === "mainnet" ? Networks.PUBLIC : Networks.TESTNET;
}

export function isTestnet(): boolean {
  return config.stellar.network !== "mainnet";
}
