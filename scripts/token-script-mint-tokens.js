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

  // We get the contract to deploy
  // const provider = new hre.ethers.providers.getDefaultProvider();
  const provider = hre.ethers.provider;
  const wallet = new hre.ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider);
  // const wallet = new hre.ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
  let balance = await wallet.getBalance();
  console.log(balance.toString())

  const tzkContractFactory = await hre.ethers.getContractFactory("TZK", wallet);
  const tzkTokenContract = await tzkContractFactory.attach("0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512");

  // await greeter.deployed();

  // console.log("Greeter deployed to:", greeter.address);

  const tx = await tzkTokenContract.tzikify("20000000000000000000");
  await tx.wait();

  let tzikisTzkBalance = await tzkTokenContract.balanceOf(wallet.address);
  console.log("TZK balance for Tzikis (Wallet 0) after tzikifying:", tzikisTzkBalance.toString());
    

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
