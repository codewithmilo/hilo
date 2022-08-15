import { BigNumber, Contract, providers, utils } from "ethers";
import abi from "../src/HILO.json";
import { CONSTANTS } from "./constants";
import { handleTxnError } from "./errors";
import { GameState } from "./types";

type HiloGameState = {
  currentHi: BigNumber;
  currentLo: BigNumber;
  winners: string[];
  playerTotals: BigNumber[];
  tokenBalances: BigNumber[];
  approvedSpend: BigNumber;
};

const getGameState = async (
  provider: providers.Web3Provider,
  address: string
): Promise<GameState> => {
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
      approvedSpend: state.approvedSpend.toNumber(),
    };
  };

  return HILOContract.getGameState(address).then((state: HiloGameState) =>
    mapToGameState(state)
  );
};

const getPrice = async (tokenId, provider, handleErrors) => {
  const HILOContract = new Contract(
    CONSTANTS.HILO_CONTRACT_ADDRESS,
    abi.abi,
    provider
  );

  return HILOContract.getPrice(tokenId)
    .then((_price) => {
      const price = _price.toNumber();
      console.log("Got price for tokenID %s: %s", tokenId, price);
      return price;
    })
    .catch((err) => handleErrors(err));
};

const getBalance = async (tokenId, provider, handleErrors) => {
  const signer = provider.getSigner();
  const address = await signer.getAddress();

  const HILOContract = new Contract(
    CONSTANTS.HILO_CONTRACT_ADDRESS,
    abi.abi,
    signer
  );

  return HILOContract.balanceOf(address, tokenId)
    .then((_balance) => {
      const balance = _balance.toNumber();
      console.log("Got balance for tokenID %s: %s", tokenId, balance);
      return balance;
    })
    .catch((err) => handleErrors(err));
};

const getPlayerTotals = async (provider) => {
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
  // const registeredTotal = await HILOContract.playerCount();
  // total.registered = registeredTotal.toNumber();

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

const addToQueue = async (provider, tokenId, handleErrors) => {
  const signer = provider.getSigner();
  const HILOContract = new Contract(
    CONSTANTS.HILO_CONTRACT_ADDRESS,
    abi.abi,
    signer
  );
  console.log("Checking if in queue...");
  const result = await HILOContract.checkInQueue().catch((err) =>
    handleErrors(err)
  );
  console.log(result);
  const index = result.toNumber();
  console.log("In queue at index", index);

  if (index === 0) {
    console.log("Adding to queue...");
    return await HILOContract.addToQueue(tokenId)
      .then((txn) => {
        console.log(txn);
        return provider.waitForTransaction(txn.hash);
      })
      .then((result) => {
        console.log(result);
        return result.toNumber();
      })
      .catch((err) => handleErrors(err));
  }

  return index;
};

const checkApproval = async (provider, setApproved, amount) => {
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
  _amount,
  provider,
  setPendingAmount,
  handleErrors
) => {
  // Show in the UI
  setPendingAmount(_amount);

  const signer = provider.getSigner();
  const usdcABI = [
    "function approve(address _spender, uint256 _value) public returns (bool success)",
  ];

  // Format for the actual transaction
  const amount = utils.parseUnits(_amount.toString(), 18);

  const USDCContract = new Contract(CONSTANTS.USDC_ADDRESS, usdcABI, signer);

  return USDCContract.approve(CONSTANTS.HILO_CONTRACT_ADDRESS, amount)
    .catch((err) => handleTxnError(err))
    .then((txn) => provider.waitForTransaction(txn.hash))
    .then((receipt) => {
      console.log("Approved!", receipt);
      setPendingAmount(0);
    })
    .catch((err) => {
      handleErrors(err);
      // don't let us continue
      throw err;
    });
};

const setupGameEvents = (provider, account, updateFn, bannerUpdate) => {
  const HILOContract = new Contract(
    CONSTANTS.HILO_CONTRACT_ADDRESS,
    abi.abi,
    provider
  );

  let filter = HILOContract.filters.PriceUpdated(null);

  HILOContract.on(filter, (player, _tokenId, event) => {
    const tokenId = _tokenId.toNumber();
    console.log("PriceUpdated:", player, tokenId, event);
    if (player === account) return;
    bannerUpdate(tokenId);
    updateFn();
  });

  filter = HILOContract.filters.PricesConverged(null);

  HILOContract.on(filter, (winners, price, event) => {
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
