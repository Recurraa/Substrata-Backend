export interface ChainEventDto {
  id: string;
  type: string;
  contractId: string;
  txHash: string;
  ledger?: number | null;
  payload: unknown;
  createdAt: string | Date;
}
