import { BigNumber, Contract, providers, utils } from "ethers";
import { Dispatch, SetStateAction } from "react";
import abi from "../src/HILO.json";
import { CONSTANTS } from "./constants";
import {
  GameState,
  SolidityError,
  SolidityErrorHandler,
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
  console.log(err);
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

const getPrice = async (
  tokenId: Tokens,
  provider: providers.Web3Provider
): Promise<number | SolidityError> => {
  const HILOContract = new Contract(
    CONSTANTS.HILO_CONTRACT_ADDRESS,
    abi.abi,
    provider
  );

  return HILOContract.getPrice(tokenId)
    .then((_price: BigNumber) => {
      const price = _price.toNumber();
      console.log("Got price for tokenID %s: %s", tokenId, price);
      return price;
    })
    .catch((err: SolidityError) => {
      console.log(err);
      return err;
    });
};

const getBalance = async (
  tokenId: Tokens,
  provider: providers.Web3Provider,
  handleErrors: SolidityErrorHandler
): Promise<number> => {
  const signer = provider.getSigner();
  const address = await signer.getAddress();

  const HILOContract = new Contract(
    CONSTANTS.HILO_CONTRACT_ADDRESS,
    abi.abi,
    signer
  );

  return HILOContract.balanceOf(address, tokenId)
    .then((_balance: BigNumber) => {
      const balance = _balance.toNumber();
      console.log("Got balance for tokenID %s: %s", tokenId, balance);
      return balance;
    })
    .catch((err: SolidityError) => handleErrors(err));
};

const getPlayerTotals = async (provider: providers.Web3Provider) => {
  const HILOContract = new Contract(
    CONSTANTS.HILO_CONTRACT_ADDRESS,
    abi.abi,
    provider
  );
  let total = {
    hi: null,
    lo: null,
    registered: null,
  };

  return await HILOContract.totalSupply(CONSTANTS.HI_TOKEN_ID).then(
    (supply) => {
      console.log("HI supply:", supply.toNumber());
      total.hi = supply.toNumber();

      return HILOContract.totalSupply(CONSTANTS.LO_TOKEN_ID)
        .then((supply) => {
          console.log("LO supply:", supply.toNumber());
          total.lo = supply.toNumber();
          total.registered = total.hi + total.lo;
          return total;
        })
        .catch((err) => {
          console.log(err);
          return null;
        });
    }
  );
};

const getWinners = async (provider, handleErrors) => {
  const HILOContract = new Contract(
    CONSTANTS.HILO_CONTRACT_ADDRESS,
    abi.abi,
    provider
  );

  return await HILOContract.gameWon()
    .then((gameWon) => {
      console.log("gameWon:", gameWon);
      if (gameWon) {
        return HILOContract.getWinners();
      } else {
        return [];
      }
    })
    .catch((err) => handleErrors(err));
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
      console.log("position:", position.toNumber());
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
  return await HILOContract.addToQueue(tokenId)
    .then((txn: SolidityTxn) => provider.waitForTransaction(txn.hash))
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

const checkApproval = async (
  provider: providers.Web3Provider,
  amount: number
): Promise<boolean> => {
  const signer = provider.getSigner();
  const address = await signer.getAddress();
  const usdcABI = [
    "function allowance(address owner, address spender) external view returns (uint256)",
  ];
  const USDCContract = new Contract(CONSTANTS.USDC_ADDRESS, usdcABI, signer);

  return USDCContract.allowance(address, CONSTANTS.HILO_CONTRACT_ADDRESS).then(
    (_allowance: BigNumber) => {
      const allowance = parseInt(utils.formatEther(_allowance));
      console.log("Allowance is", allowance);
      return allowance >= amount;
    }
  );
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
  bannerUpdate: (token: Tokens) => void
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
    if (player === account) return;
    bannerUpdate(tokenId);
    updateFn();
  });

  filter = HILOContract.filters.PricesConverged(null);

  HILOContract.on(filter, (winners: string[], price: BigNumber, event: any) => {
    console.log("pricesConverged:", winners, price.toNumber(), event);
    if (winners.includes(account)) return; // skip if we just won
    updateFn();
  });
};
