const hre = require("hardhat");

async function main() {
  const hiPrice = 5;
  const loPrice = 1;
  const buyCount = 2;

  // We get the contract to deploy
  const HILOToken = await hre.ethers.getContractFactory("HILOToken");
  const token = await HILOToken.deploy(hiPrice, loPrice, buyCount);

  await token.deployed();

  console.log("Token deployed to:", token.address);
  console.log("Don't forget to update HILOToken.json with the new ABI!");
  console.log("And then, update index.js with the new contract address!");

  // After this finishes, run `npx hardhat verify ~token.address~ ~hiPrice~ ~loPrice~ ~buyCount~` to verify
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
