import { providers } from "ethers";

export type SolidityTxn = providers.TransactionResponse;
export type SolidityTxnReceipt = providers.TransactionReceipt;

export function isSolidityTxnReceipt(
  receipt: any
): receipt is SolidityTxnReceipt {
  return receipt.status !== undefined;
}

export type SolidityError = any;
export type SolidityErrorHandler = (error: SolidityError) => void;

export function isSolidityError(error: any): error is SolidityError {
  return error.code !== undefined;
}

export type GameState = {
  currentHi: number;
  currentLo: number;
  winners: string[];
  playerTotals: number[];
  tokenBalances: number[];
  approvedSpend: number;
};

export enum Tokens {
  HI,
  LO,
}

export enum Modals {
  HOW_TO_PLAY,
  APPROVE,
  BUY,
  SELL,
}

export enum PageState {
  UNLOADED,
  NO_WALLET,
  READY,
  OVER,
}
