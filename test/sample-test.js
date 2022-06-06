const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Token", function () {
  const hiPrice = 2;
  const loPrice = 1;
  const HILOToken = await ethers.getContractFactory("HILOToken");
  const token = await HILOToken.deploy(hiPrice, loPrice);
  await token.deployed();

  it("Should return the token prices", async function () {
    const _hiPrice = await token.getPrice(0);
    expect(_hiPrice).to.equal(hiPrice);

    const _loPrice = await token.getPrice(1);
    expect(_loPrice).to.equal(loPrice);
  });
  it("Should be able to sell tokens", async function () {
    
  });
});
