const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Token Bridge", function () {
  let tokenBridgeFactory;
  let tokenBridgeContract;

  let tokenSampleFactory;
  let tokenSampleContract;

  let owner;
  let addr1; 

  before(async () => {
    [owner, addr1] = await ethers.getSigners();

    tokenSampleFactory = await ethers.getContractFactory("TZK");
    tokenSampleContract = await tokenSampleFactory.deploy();
    await tokenSampleContract.deployed();

    tokenBridgeFactory = await ethers.getContractFactory("TokenBridge");
    tokenBridgeContract = await tokenBridgeFactory.deploy();
    await tokenBridgeContract.deployed();

    const tokenMintingTx = await tokenSampleContract.tzikify(100000);
    // wait until the transaction is mined
    await tokenMintingTx.wait();
    expect(await tokenSampleContract.balanceOf(owner.address)).to.equal(100000);
  });

  it("Should lock a user's native tokens if they have approved the contract to transferFrom them their tokens", async function () {
    let transactionObject;
    const sampleTokenAddress = tokenSampleContract.address;
    const tokenBridgeContractAddress = tokenBridgeContract.address;
    // console.log(owner.address);
    // console.log(tokenBridgeContractAddress);
    // console.log(sampleTokenAddress);

    const allowanceAmount = 100;
    transactionObject = await tokenSampleContract.approve(tokenBridgeContractAddress, allowanceAmount);
    await transactionObject.wait();
    const allowance = await tokenSampleContract.allowance(owner.address, tokenBridgeContractAddress);
    expect(allowance).to.equal(allowanceAmount);

    const targetChain = 3;
    transactionObject = await tokenBridgeContract.lock(targetChain, sampleTokenAddress, allowanceAmount);
    await transactionObject.wait();
    const lockedAmount = await tokenBridgeContract.lockedTokens(sampleTokenAddress, owner.address);
    expect(lockedAmount).to.equal(allowanceAmount);
    
  });
});
