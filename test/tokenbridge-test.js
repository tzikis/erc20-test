const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Token Bridge", function () {
  let tokenBridgeFactory;
  let tokenBridgeContract;

  let tokenSampleFactory;
  let tokenSampleContract;

  let owner;
  let addr1; 

  let chainId;
  let validTargetChainId;

  let sampleTokenAddress;
  let tokenBridgeContractAddress;

  before(async () => {
    [owner, addr1] = await ethers.getSigners();

    tokenSampleFactory = await ethers.getContractFactory("TZK");
    tokenSampleContract = await tokenSampleFactory.deploy();
    await tokenSampleContract.deployed();
    sampleTokenAddress = tokenSampleContract.address;

    tokenBridgeFactory = await ethers.getContractFactory("TokenBridge");
    tokenBridgeContract = await tokenBridgeFactory.deploy();
    await tokenBridgeContract.deployed();
    tokenBridgeContractAddress = tokenBridgeContract.address;

    const tokenMintingTx = await tokenSampleContract.tzikify(100000);
    // wait until the transaction is mined
    await tokenMintingTx.wait();
    expect(await tokenSampleContract.balanceOf(owner.address)).to.equal(100000);

    chainId = await tokenBridgeContract.getChainID();
    validTargetChainId = chainId + 1;
  });

  it("Should lock a user's native tokens if they have approved the contract to transferFrom them their tokens", async function () {
    let transactionObject;
    const allowanceAmount = 100;
    transactionObject = await tokenSampleContract.approve(tokenBridgeContractAddress, allowanceAmount);
    await transactionObject.wait();
    const allowance = await tokenSampleContract.allowance(owner.address, tokenBridgeContractAddress);
    expect(allowance).to.equal(allowanceAmount);

    transactionObject = await tokenBridgeContract.lock(validTargetChainId, sampleTokenAddress, allowanceAmount);
    await transactionObject.wait();
    const lockedAmount = await tokenBridgeContract.lockedTokens(sampleTokenAddress, owner.address);
    expect(lockedAmount).to.equal(allowanceAmount);
    
  });
});
