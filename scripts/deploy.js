const hre = require("hardhat");

async function main() {
  const hiPrice = 5;
  const loPrice = 1;
  const buyCount = 2;
  const jackpot = 5;

  // We get the contract to deploy
  const HILO = await hre.ethers.getContractFactory("HILO");
  const token = await HILO.deploy(hiPrice, loPrice, buyCount, jackpot);

  console.log("Deploying token...", token.deployTransaction.hash);
  await token.deployed();

  console.log("Token deployed to:", token.address);
  console.log("Don't forget to update HILO.json with the new ABI!");
  console.log("And then, update constants.js with the new contract address!");

  // const signer = await hre.ethers.getSigner();

  // let registered = await token.players(signer.address);
  // console.log(
  //   "======================= registered ==========================",
  //   registered
  // );

  // console.log("Calling registerPlayer...");

  // const txn = await token.registerPlayer(signer.address);
  // console.log("======================= txn ==========================", txn);
  // const receipt = await txn.wait();
  // console.log(
  //   "======================= receipt ==========================",
  //   receipt
  // );

  // registered = await token.players(signer.address);
  // console.log(
  //   "======================= registered ==========================",
  //   registered
  // );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
