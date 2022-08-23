const hre = require("hardhat");

async function main() {
  const hiPrice = 5;
  const loPrice = 1;
  const buyCount = 2;
  const jackpot = 15;

  // We get the contract to deploy
  const HILO = await hre.ethers.getContractFactory("HILO");
  const token = await HILO.deploy(hiPrice, loPrice, buyCount, jackpot);

  console.log("Deploying token...", token.deployTransaction.hash);
  await token.deployed();

  console.log("Token deployed to:", token.address);
  console.log("Don't forget to update HILO.json with the new ABI!");
  console.log("And then, update constants.js with the new contract address!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
