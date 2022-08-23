import { BigNumber, Contract, providers, utils } from "ethers";
import abi from "../src/HILO.json";
import { CONSTANTS } from "./constants";
import {
  GameState,
  SolidityError,
  SolidityTxn,
  SolidityTxnReceipt,
  Tokens,
} from "./types";

type HiloGameState = {
  currentHi: BigNumber;
  currentLo: BigNumber;
  winners: string[];
  playerTotals: BigNumber[];
  tokenBalances: BigNumber[];
  approvedSpend: BigNumber;
};

const maybeHandleTxnReplaced = (err: SolidityError): SolidityTxn | void => {
  console.log("txn replaced", err);
  const errCode = err.code;
  console.log(errCode);
  console.log(err.replacement);

  // if we changed the txn, send through the new one
  if (errCode === "TRANSACTION_REPLACED") {
    return err.replacement;
  } else {
    throw err;
  }
};

export const getGameState = async (
  provider: providers.Web3Provider,
  address: string
): Promise<GameState | SolidityError> => {
  const HILOContract = new Contract(
    CONSTANTS.HILO_CONTRACT_ADDRESS,
    abi.abi,
    provider
  );

  const mapToGameState = (state: HiloGameState): GameState => {
    return {
      currentHi: state.currentHi.toNumber(),
      currentLo: state.currentLo.toNumber(),
      winners: state.winners,
      playerTotals: state.playerTotals.map((total) => total.toNumber()),
      tokenBalances: state.tokenBalances.map((balance) => balance.toNumber()),
      approvedSpend: Number(state.approvedSpend.toBigInt()) / 1e18,
    };
  };

  return HILOContract.getGameState(address)
    .then((state: HiloGameState) => mapToGameState(state))
    .catch((err: SolidityError) => err);
};

export const checkCanSell = async (
  provider: providers.Web3Provider,
  tokenId: Tokens
): Promise<SolidityError | boolean> => {
  const HILOContract = new Contract(
    CONSTANTS.HILO_CONTRACT_ADDRESS,
    abi.abi,
    provider
  );

  return HILOContract.canSell(tokenId)
    .then((canSell: boolean) => {
      console.log("canSell:", canSell);
      return canSell;
    })
    .catch((err: SolidityError) => err);
};

export const checkQueuePosition = async (
  provider: providers.Web3Provider,
  tokenId: Tokens
): Promise<SolidityError | number> => {
  const HILOContract = new Contract(
    CONSTANTS.HILO_CONTRACT_ADDRESS,
    abi.abi,
    provider
  );

  return HILOContract.checkInQueue(tokenId)
    .then((position: BigNumber) => {
      console.log("position:", position.toNumber(), tokenId);
      return position.toNumber();
    })
    .catch((err: SolidityError) => err);
};

export const joinSellQueue = async (
  provider: providers.Web3Provider,
  tokenId: Tokens
): Promise<SolidityError | number> => {
  const signer = provider.getSigner();
  const HILOContract = new Contract(
    CONSTANTS.HILO_CONTRACT_ADDRESS,
    abi.abi,
    signer
  );
  return HILOContract.addToQueue(tokenId)
    .then((txn: SolidityTxn) => provider.waitForTransaction(txn.hash))
    .then((receipt: SolidityTxnReceipt) => {
      console.log("Joined queue", receipt);
      return HILOContract.checkInQueue(tokenId);
    })
    .then((position: BigNumber) => position.toNumber())
    .catch((err: SolidityError) => err);
};

export const buy = async (
  provider: providers.Web3Provider,
  token: Tokens,
  amount: 1 | 3
): Promise<SolidityTxnReceipt | SolidityError> => {
  const signer = provider.getSigner();
  const HILOContract = new Contract(
    CONSTANTS.HILO_CONTRACT_ADDRESS,
    abi.abi,
    signer
  );
  return HILOContract.buy(token, amount)
    .then((txn: SolidityTxn) => provider.waitForTransaction(txn.hash))
    .catch((err: SolidityError) => maybeHandleTxnReplaced(err))
    .then((receipt: SolidityTxnReceipt) => {
      console.log("Bought!", receipt);
      return receipt;
    })
    .catch((err: SolidityError) => {
      console.log(err);
      return err;
    });
};

export const sell = async (
  provider: providers.Web3Provider,
  token: Tokens
): Promise<SolidityTxnReceipt | SolidityError> => {
  const signer = provider.getSigner();
  const HILOContract = new Contract(
    CONSTANTS.HILO_CONTRACT_ADDRESS,
    abi.abi,
    signer
  );
  return HILOContract.sell(token)
    .then((txn: SolidityTxn) => provider.waitForTransaction(txn.hash))
    .catch((err: SolidityError) => maybeHandleTxnReplaced(err))
    .then((receipt: SolidityTxnReceipt) => {
      console.log("Sold!", receipt);
      return receipt;
    })
    .catch((err: SolidityError) => {
      console.log(err);
      return err;
    });
};

export const approvePayments = async (
  _amount: number,
  provider: providers.Web3Provider
): Promise<SolidityTxnReceipt | SolidityError> => {
  const signer = provider.getSigner();
  const usdcABI = [
    "function approve(address _spender, uint256 _value) public returns (bool success)",
  ];

  // Format for the actual transaction
  const amount = utils.parseUnits(_amount.toString(), 18);

  const USDCContract = new Contract(CONSTANTS.USDC_ADDRESS, usdcABI, signer);

  return USDCContract.approve(CONSTANTS.HILO_CONTRACT_ADDRESS, amount)
    .then((txn: SolidityTxn) => provider.waitForTransaction(txn.hash))
    .catch((err: SolidityError) => maybeHandleTxnReplaced(err))
    .then((receipt: SolidityTxnReceipt) => {
      console.log("Approved!", receipt);
      return receipt;
    })
    .catch((err: SolidityError) => {
      console.log(err);
      return err;
    });
};

export const setupGameEvents = (
  provider: providers.Web3Provider,
  account: string,
  updateFn: () => Promise<any>,
  priceUpdate: (token: Tokens) => void
) => {
  const HILOContract = new Contract(
    CONSTANTS.HILO_CONTRACT_ADDRESS,
    abi.abi,
    provider
  );

  let filter = HILOContract.filters.PriceUpdated(null);

  HILOContract.on(filter, (player: string, _tokenId: BigNumber, event: any) => {
    const tokenId = _tokenId.toNumber() as Tokens;
    console.log("PriceUpdated:", player, tokenId, event);
    priceUpdate(tokenId);
    updateFn();
  });

  filter = HILOContract.filters.PricesConverged(null);

  HILOContract.on(filter, (winners: string[], price: BigNumber, event: any) => {
    console.log("pricesConverged:", winners, price.toNumber(), event);
    if (winners.includes(account)) return; // skip if we just won
    updateFn();
  });
};
