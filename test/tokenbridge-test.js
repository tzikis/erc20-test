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
  let differentChainId;

  let sampleTokenAddress;
  let tokenBridgeContractAddress;

  const wrappedTokenInfo = { name: "Tzikis Token", symbol: "TZK" };
  const invalidSignature = {v: 28, r: "0x24a6dd3963aaed3770d9f09b89289ef5973216404d30553906a729c318340553", s: "0x4d7cada1ac5d093b6d5f9fe802870a1fdcf7700202f9757fcaee2763ec9528a3"}

  let validLockData;
  let validLockSignature;

  let validBurnSignature;

  const createValidSignature = async (_signer, _tokenBridgeContractAddress, _functionName, _chainId, _tokenAddress, _receiverAddress, _amount, _nonce) => {
    // console.log(_signer + " " + _tokenBridgeContractAddress + " " + _functionName + " " + _chainId + " " + _tokenAddress + " " + _receiverAddress + " " + _amount + " " + _nonce);

    const domain = {
      name: "Tzikis TokenBridge",
      version: '1',
      verifyingContract: _tokenBridgeContractAddress
    };

    // The named list of all type definitions
    const types = {
      Verify : [ // array of objects -> properties from erc20withpermit
      { name: 'functionName', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'tokenAddress', type: 'address' },
      { name: 'receiverAddress', type: 'address' },
      { name: 'amount', type: 'uint32' },
      { name: 'nonce', type: 'uint32' }
    ]
    };
    // owner, tokenBridgeContractAddress, "lock()", chainId, sampleTokenAddress, owner.address, 105, 1 
    const message = {
      functionName: _functionName, // Wallet Address
      chainId: _chainId,
      tokenAddress: _tokenAddress, // This is the address of the contract.
      receiverAddress: _receiverAddress, // This is the address of the spender whe want to give permit to.
      amount: _amount,
      nonce: _nonce
    };

    let signature = await _signer._signTypedData(domain, types, message);
    return signature;
  }

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
    differentChainId = chainId + 1;
  });

  it("Should fail when trying to lock 0 tokens", async function () {
    expect(tokenBridgeContract.lock(differentChainId, sampleTokenAddress, 0)).to.be.revertedWith("");
  });

  it("Should fail when trying to lock using the current chain as a target", async function () {
    expect(tokenBridgeContract.lock(chainId, sampleTokenAddress, 5)).to.be.revertedWith("");
  });

  it("Should fail when trying to lock if the user hasn't approved the contract to transferFrom them their tokens", async function () {
    expect(tokenBridgeContract.lock(differentChainId, sampleTokenAddress, 5)).to.be.revertedWith("");
  });

  it("Should lock a user's native tokens if they have approved the contract to transferFrom them their tokens", async function () {
    let transactionObject;
    const allowanceAmount = 100;
    transactionObject = await tokenSampleContract.approve(tokenBridgeContractAddress, allowanceAmount);
    await transactionObject.wait();
    const allowance = await tokenSampleContract.allowance(owner.address, tokenBridgeContractAddress);
    expect(allowance).to.equal(allowanceAmount);

    transactionObject = await tokenBridgeContract.lock(differentChainId, sampleTokenAddress, allowanceAmount);
    await transactionObject.wait();
    const lockedAmount = await tokenBridgeContract.lockedTokens(sampleTokenAddress, owner.address);
    expect(lockedAmount).to.equal(allowanceAmount);
    
  });

  before(async () => {
    validLockData = {
      functionName: "lock()", 
      chainId: chainId,
      tokenAddress: sampleTokenAddress, 
      receiverAddress: owner.address, 
      amount: 105,
      nonce: 1
    };

    const signature = await createValidSignature(owner, tokenBridgeContractAddress, validLockData.functionName, validLockData.chainId, validLockData.tokenAddress, validLockData.receiverAddress, validLockData.amount, validLockData.nonce);
    validLockSignature = ethers.utils.splitSignature(signature);

  });

  it("Should verify correctly signed valid data", async function () {
    // expect(tokenBridgeContract.mint(chainId, sampleTokenAddress, owner.address, 0, 1, wrappedTokenInfo, 28, "0x1483e41ac1f71fb32235555164c62d83845a273da03901fe6118d8a9ac9ea0a7", "0x1e75048fa860ed722a58ea241f0dcf862cf8a0d127da8b31c2a4cec9e7c60243")).to.be.revertedWith("");
    const signer = await tokenBridgeContract.verify(validLockData.functionName, validLockData.chainId, validLockData.tokenAddress, validLockData.receiverAddress, validLockData.amount, validLockData.nonce, validLockSignature.v, validLockSignature.r, validLockSignature.s);
    expect(signer).to.equal(owner.address);
  });

  it("Should give a very different address with a minor change", async function () {
    // expect(tokenBridgeContract.mint(chainId, sampleTokenAddress, owner.address, 0, 1, wrappedTokenInfo, 28, "0x1483e41ac1f71fb32235555164c62d83845a273da03901fe6118d8a9ac9ea0a7", "0x1e75048fa860ed722a58ea241f0dcf862cf8a0d127da8b31c2a4cec9e7c60243")).to.be.revertedWith("");
    const signer = await tokenBridgeContract.verify(validLockData.functionName, validLockData.chainId, validLockData.tokenAddress, validLockData.receiverAddress, validLockData.amount+1, validLockData.nonce, validLockSignature.v, validLockSignature.r, validLockSignature.s);
    expect(signer).to.not.equal(owner.address);
  });

  it("Should fail when trying to mint 0 tokens", async function () {
    expect(tokenBridgeContract.mint(chainId, sampleTokenAddress, owner.address, 0, 1, wrappedTokenInfo, 28, "0x1483e41ac1f71fb32235555164c62d83845a273da03901fe6118d8a9ac9ea0a7", "0x1e75048fa860ed722a58ea241f0dcf862cf8a0d127da8b31c2a4cec9e7c60243")).to.be.revertedWith("");
  });

  it("Should fail when trying to mint using a different chain as a target", async function () {
    expect(tokenBridgeContract.mint(differentChainId, sampleTokenAddress, owner.address, 5, 1, wrappedTokenInfo, 28, "0x1483e41ac1f71fb32235555164c62d83845a273da03901fe6118d8a9ac9ea0a7", "0x1e75048fa860ed722a58ea241f0dcf862cf8a0d127da8b31c2a4cec9e7c60243")).to.be.revertedWith("");
  });

  it("Should fail when trying to mint with an invalid signature", async function () {
    expect(tokenBridgeContract.mint(validLockData.chainId, validLockData.tokenAddress, validLockData.receiverAddress, validLockData.amount, validLockData.nonce, wrappedTokenInfo, invalidSignature.v, invalidSignature.r, invalidSignature.s)).to.be.revertedWith("");
  });

  it("Should work when minting with valid info (with a non-existing token)", async function () {
    let transactionObject;
    transactionObject = await tokenBridgeContract.mint(validLockData.chainId, validLockData.tokenAddress, validLockData.receiverAddress, validLockData.amount, validLockData.nonce, wrappedTokenInfo, validLockSignature.v, validLockSignature.r, validLockSignature.s);
    await transactionObject.wait();
    const wrappedTokenAddress = await tokenBridgeContract.wrappedTokenAddresses(sampleTokenAddress);

    wrappedTokenFactory = await ethers.getContractFactory("ERC20");
    wrappedTokenContract = await wrappedTokenFactory.attach(wrappedTokenAddress);
    const mintedAmount = await wrappedTokenContract.balanceOf(validLockData.receiverAddress);
    expect(mintedAmount).to.equal(validLockData.amount);
  });

  it("Should not mint with the same nonce twice", async function () {
    expect(tokenBridgeContract.mint(validLockData.chainId, validLockData.tokenAddress, validLockData.receiverAddress, validLockData.amount, validLockData.nonce, wrappedTokenInfo, validLockSignature.v, validLockSignature.r, validLockSignature.s)).to.be.revertedWith("");
  });

  let validSecondLockData;
  let secondSignature;
  let  validSecondLockSignature;
  before(async () => {
    validSecondLockData = {
      functionName: "lock()", 
      chainId: chainId,
      tokenAddress: sampleTokenAddress, 
      receiverAddress: owner.address, 
      amount: 105,
      nonce: 2
    };

    secondSignature = await createValidSignature(owner, tokenBridgeContractAddress, validSecondLockData.functionName, validSecondLockData.chainId, validSecondLockData.tokenAddress, validSecondLockData.receiverAddress, validSecondLockData.amount, validSecondLockData.nonce);
    validSecondLockSignature = ethers.utils.splitSignature(secondSignature);
  });


  it("Should work when minting with a wrapped Token we already created", async function () {
    let transactionObject;
    transactionObject = await tokenBridgeContract.mint(validSecondLockData.chainId, validSecondLockData.tokenAddress, validSecondLockData.receiverAddress, validSecondLockData.amount, validSecondLockData.nonce, wrappedTokenInfo, validSecondLockSignature.v, validSecondLockSignature.r, validSecondLockSignature.s);
    await transactionObject.wait();
    const wrappedTokenAddress = await tokenBridgeContract.wrappedTokenAddresses(sampleTokenAddress);

    wrappedTokenFactory = await ethers.getContractFactory("ERC20");
    wrappedTokenContract = await wrappedTokenFactory.attach(wrappedTokenAddress);
    const mintedAmount = await wrappedTokenContract.balanceOf(validSecondLockData.receiverAddress);
    expect(mintedAmount).to.equal(validLockData.amount + validSecondLockData.amount);
  });

});