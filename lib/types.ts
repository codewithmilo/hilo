export type ErrorBannerProps = {
  error: string;
  closeFn: () => void | null;
};

export type ConnectButtonProps = { connectFn: () => void };

export type WinnersProps = {
  player: string;
  winners: string[];
};

export type PriceUpdateProps = {
  token: Tokens;
  closeFn: () => void;
};

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
