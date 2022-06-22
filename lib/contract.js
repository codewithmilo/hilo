import { Contract, utils } from "ethers";
import abi from "../src/HILO.json";
import { CONSTANTS } from "./constants";
import { handleTxnError } from "./errors";

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
  let total = {};
  return await HILOContract.totalSupply(CONSTANTS.HI_TOKEN_ID).then(
    (supply) => {
      console.log("HI supply:", supply.toNumber());
      total.hi = supply.toNumber();

      return HILOContract.totalSupply(CONSTANTS.LO_TOKEN_ID)
        .then((supply) => {
          console.log("LO supply:", supply.toNumber());
          total.lo = supply.toNumber();
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

  let filter = HILOContract.filters.buyPriceUpdate(null);

  HILOContract.on(filter, (player, _tokenId, event) => {
    const tokenId = _tokenId.toNumber();
    console.log("buyPriceUpdate:", player, tokenId, event);
    if (player === account) return;
    bannerUpdate(tokenId);
    updateFn();
  });

  filter = HILOContract.filters.priceUpdated(null);

  HILOContract.on(filter, (player, _tokenId, event) => {
    const tokenId = _tokenId.toNumber();
    console.log("priceUpdated:", player, tokenId, event);
    if (account === player) return;
    bannerUpdate(tokenId);
    updateFn();
  });

  filter = HILOContract.filters.pricesConverged(null);

  HILOContract.on(filter, (winners, price, event) => {
    console.log("pricesConverged:", winners, price.toNumber(), event);
    if (winners.includes(account)) return; // skip if we just won
    updateFn();
  });
};

export {
  getPrice,
  getBalance,
  getPlayerTotals,
  getWinners,
  checkApproval,
  approvePayments,
  setupGameEvents,
};
