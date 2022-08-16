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

const getGameState = async (
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

const addToQueue = async (
  provider: providers.Web3Provider,
  tokenId: Tokens,
  handleErrors: SolidityErrorHandler
): Promise<number> => {
  const signer = provider.getSigner();
  const HILOContract = new Contract(
    CONSTANTS.HILO_CONTRACT_ADDRESS,
    abi.abi,
    signer
  );
  console.log("Checking if in queue...");
  const result = await HILOContract.checkInQueue().catch((err: SolidityError) =>
    handleErrors(err)
  );
  console.log(result);
  const index = result.toNumber();
  console.log("In queue at index", index);

  if (index === 0) {
    console.log("Adding to queue...");
    return await HILOContract.addToQueue(tokenId)
      .then((txn: SolidityTxn) => {
        console.log(txn);
        return provider.waitForTransaction(txn.hash);
      })
      .then((position: BigNumber) => {
        console.log(position);
        return position.toNumber();
      })
      .catch((err: SolidityError) => handleErrors(err));
  }

  return index;
};

const checkApproval = async (
  provider: providers.Web3Provider,
  setApproved,
  amount
) => {
  const signer = provider.getSigner();
  const address = await signer.getAddress();
  const usdcABI = [
    "function allowance(address owner, address spender) external view returns (uint256)",
  ];
  const USDCContract = new Contract(CONSTANTS.USDC_ADDRESS, usdcABI, signer);

  return USDCContract.allowance(address, CONSTANTS.HILO_CONTRACT_ADDRESS).then(
    (_allowance) => {
      const allowance = parseInt(utils.formatEther(_allowance));
      console.log("Allowance is", allowance);

      if (allowance >= amount) {
        setApproved(true);
        return true;
      } else {
        return false;
      }
    }
  );
};

const approvePayments = async (
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

const setupGameEvents = (
  provider: providers.Web3Provider,
  account: string,
  updateFn: () => Promise<any>,
  bannerUpdate: Dispatch<SetStateAction<Tokens>>
) => {
  const HILOContract = new Contract(
    CONSTANTS.HILO_CONTRACT_ADDRESS,
    abi.abi,
    provider
  );

  let filter = HILOContract.filters.PriceUpdated(null);

  HILOContract.on(filter, (player: string, _tokenId: BigNumber, event: any) => {
    const tokenId = _tokenId.toNumber();
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

export {
  getGameState,
  getPrice,
  getBalance,
  getPlayerTotals,
  getWinners,
  addToQueue,
  checkApproval,
  approvePayments,
  setupGameEvents,
};
