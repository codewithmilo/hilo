import { ethers } from "ethers";
import abi from "../../src/HILO.json";
import { CONSTANTS } from "../../lib/constants";
require("dotenv").config();

export default async function handler(req, res) {
  const body = req.body;

  // byebyebot
  if (body.address) res.status(200).json({ ok: false });

  // connect as owner
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.ALCHEMY_URL
  );
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  // get the contract
  const contract = new ethers.Contract(
    CONSTANTS.HILO_CONTRACT_ADDRESS,
    abi.abi,
    signer
  );

  // register the user
  let receipt;
  try {
    console.log("========================= GAS =========================");
    let gasEstimate = await contract.estimateGas.registerPlayer(body.account);
    console.log("registerPlayer gas:", gasEstimate.toNumber());

    console.log("====================== TXN ===========================");
    const txn = await contract.registerPlayer(body.account, {
      gasPrice: gasEstimate * 2,
    });
    console.log(txn);
    receipt = await txn.wait();
    console.log(receipt);
  } catch (error) {
    console.log(error);
    if (
      error &&
      error.error &&
      error.error.reason === "execution reverted: Player already registered"
    ) {
      // If we already registered, then we can just continue
      return res.status(200).json({ ok: true });
    }
    return res.status(500).json({ ok: false, error });
  }

  // okey dokey!
  return res.status(200).json({ ok: !!receipt.status });
}
