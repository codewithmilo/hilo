const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Token", function () {
  let hiPrice;
  let loPrice;
  let buyRequiredCount;
  let HILOToken;
  let token;

  beforeEach(async () => {
    hiPrice = 2;
    loPrice = 1;
    buyRequiredCount = 1;
    HILOToken = await ethers.getContractFactory("HILOToken");
    token = await HILOToken.deploy(hiPrice, loPrice, buyRequiredCount);
  });

  it("Should return the token prices", async function () {
    const _hiPrice = await token.getPrice(0);
    expect(_hiPrice).to.equal(hiPrice);

    const _loPrice = await token.getPrice(1);
    expect(_loPrice).to.equal(loPrice);
  });

  it("Should be able to buy tokens", async function () {
    const [owner] = await ethers.getSigners();
    await token.connect(owner).buy(0);
    expect(await token.balanceOf(owner.address, 0)).to.equal(1);
  });
});
