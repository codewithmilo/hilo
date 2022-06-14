const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Token", function () {
  // it("Should return the token prices", async function () {
  //   const hiPrice = 2;
  //   const loPrice = 1;
  //   const buyRequiredCount = 1;
  //   const HILOToken = await ethers.getContractFactory("HILOToken");
  //   const token = await HILOToken.deploy(hiPrice, loPrice, buyRequiredCount);
  //   await token.deployed();

  //   const _hiPrice = await token.getPrice(0);
  //   expect(_hiPrice).to.equal(hiPrice);

  //   const _loPrice = await token.getPrice(1);
  //   expect(_loPrice).to.equal(loPrice);
  // });
  it("Should be able to buy tokens", async function () {
    const hiPrice = 2;
    const loPrice = 1;
    const buyRequiredCount = 1;
    const HILOToken = await ethers.getContractFactory("HILOToken");
    const token = await HILOToken.deploy(hiPrice, loPrice, buyRequiredCount);

    const [owner] = await ethers.getSigners();
    await token.buy(0, hiPrice);
    expect(await token.balanceOf(owner.address, 0)).to.equal(1);
  });
});
