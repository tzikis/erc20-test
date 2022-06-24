// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  const wallet0PrivateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const wallet1PrivateKey = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
  const tokenAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  // const tokenBridgeAddress = "0x610178dA211FEF7D417bC0e6FeD39F05609AD788";
  const tokenBridgeAddress = "0x8f86403A4DE0BB5791fa46B8e795C547942fE4Cf";

  const tokenCount = 6;

  // We get the contract to deploy
  // const provider = new hre.ethers.providers.getDefaultProvider();
  const provider = hre.ethers.provider;
  const wallet0 = new hre.ethers.Wallet(wallet0PrivateKey, provider);
  // const wallet = new hre.ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
  let balance = await wallet0.getBalance();
  console.log("Wallet 0 balance: " + balance.toString())


  const wallet1 = new hre.ethers.Wallet(wallet1PrivateKey, provider);
  // const wallet = new hre.ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
  balance = await wallet1.getBalance();
  console.log("Wallet 1 balance: " + balance.toString())

  const tzkContractFactory = await hre.ethers.getContractFactory("TZK", wallet1);
  const tzkTokenContract = await tzkContractFactory.attach(tokenAddress);
  let tzikisTzkBalance = await tzkTokenContract.balanceOf(wallet1.address);
  console.log("TZK balance for Wallet 1 before locking:", tzikisTzkBalance.toString());

  var tzikisTzkBridgeAllowance = await tzkTokenContract.allowance(wallet1.address, tokenBridgeAddress);
  console.log("Allowance for Wallet 1 TZK Tokens to Token Bridge:", tzikisTzkBridgeAllowance.toString());

  if(tzikisTzkBridgeAllowance.lt(tokenCount))
  {
    let tokenCountBigNum = hre.ethers.BigNumber.from(tokenCount);
    console.log("Setting an allowance of " + tokenCountBigNum.toString() + " tokens from " + wallet1.address + " to " + tokenBridgeAddress);
    const txApprove = await tzkTokenContract.approve(tokenBridgeAddress, tokenCountBigNum);
    let txApproveResponse = await txApprove.wait();
    // console.log(txApproveResponse);

    let tzikisTzkBridgeAllowance = await tzkTokenContract.allowance(wallet1.address, tokenBridgeAddress);
    console.log("Allowance for Wallet 1 TZK Tokens to Token Bridge:", tzikisTzkBridgeAllowance.toString());

  }

  const tokenBridgeContractFactoryAsOwner = await hre.ethers.getContractFactory("TokenBridge", wallet0);
  const tokenBridgeContractAsOwner = await tokenBridgeContractFactoryAsOwner.attach(tokenBridgeAddress);

  const tokenBridgeContractFactory = await hre.ethers.getContractFactory("TokenBridge", wallet1);
  const tokenBridgeContract = await tokenBridgeContractFactory.attach(tokenBridgeAddress);

  let tx = await tokenBridgeContract.lock(1, tokenAddress, tokenCount, { gasLimit: 10000000});
  let maybeResponse = await tx.wait();
  // console.log(maybeResponse);

  tzikisTzkBalance = await tzkTokenContract.balanceOf(wallet1.address);
  console.log("TZK balance for Wallet 1 after locking:", tzikisTzkBalance.toString());

  bridgeBalance = await tzkTokenContract.balanceOf(tokenBridgeContract.address);
  console.log("TZK balance for Token Bridge (Wallet 1) after locking:", bridgeBalance.toString());

  tx = await tokenBridgeContractAsOwner.unlock(tokenAddress, wallet1.address, tokenCount, { gasLimit: 10000000});
  await tx.wait();

  tzikisTzkBalance = await tzkTokenContract.balanceOf(wallet1.address);
  console.log("TZK balance for Tzikis Wallet 1 after unlocking:", tzikisTzkBalance.toString());

  bridgeBalance = await tzkTokenContract.balanceOf(tokenBridgeContract.address);
  console.log("TZK balance for Token Bridge Wallet 1 after locking:", bridgeBalance.toString());

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
