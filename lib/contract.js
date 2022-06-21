import { Contract, utils } from "ethers";
import abi from "../src/HILO.json";
import { CONSTANTS } from "./constants";
import { handleTxnError } from "./errors";

const getPrice = async (tokenId, provider, setPrice, handleErrors) => {
  const HILOContract = new Contract(
    CONSTANTS.HILO_CONTRACT_ADDRESS,
    abi.abi,
    provider
  );

  return await HILOContract.getPrice(tokenId)
    .then((_price) => {
      const price = _price.toNumber();
      console.log("Got price for tokenID %s: %s", tokenId, price);
      setPrice(price);
      return price;
    })
    .catch((err) => handleErrors(err));
};

const getBalance = async (tokenId, provider, setHas, handleErrors) => {
  const signer = provider.getSigner();
  const address = await signer.getAddress();

  const HILOContract = new Contract(
    CONSTANTS.HILO_CONTRACT_ADDRESS,
    abi.abi,
    signer
  );

  await HILOContract.balanceOf(address, tokenId)
    .then((balance) => {
      console.log(
        "Got balance for tokenID %s: %s",
        tokenId,
        balance.toNumber()
      );
      setHas(balance.toNumber() > 0);
    })
    .catch((err) => handleErrors(err));
};

const checkApproval = async (
  provider,
  setApproved,
  amount = CONSTANTS.INITIAL_HI
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
      console.log("Allowance is:", allowance);

      if (allowance >= amount) {
        if (allowance >= CONSTANTS.INITIAL_HI) setApproved(true);
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

export { getPrice, getBalance, checkApproval, approvePayments };