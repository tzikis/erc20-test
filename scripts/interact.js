const hre = require("hardhat");


const dotenv = require("dotenv");

dotenv.config({path: __dirname + '/../.env'});
const { INFURA_API_KEY, PRIVATE_KEY, ETHERSCAN_API_KEY } = process.env;

async function main() {

  const ETHWrapperFactory = await hre.ethers.getContractFactory("ETHWrapper");
  const provider = new hre.ethers.providers.InfuraProvider("rinkeby", INFURA_API_KEY);
  const wallet = new hre.ethers.Wallet(PRIVATE_KEY, provider);
  const balance = await wallet.getBalance();
  
  console.log(balance.toString())
  const wrapValue = hre.ethers.utils.parseEther("1")

  const ETHWrapperContract = await ETHWrapperFactory.attach("0x853f566b4d8AC770464D01cd7409dB743Fd05Be3");

  console.log("ETHWrapper Address:");
  console.log(ETHWrapperContract.address)  

  const WETHFactory = await hre.ethers.getContractFactory("WETH");
  const wethAddress = await ETHWrapperContract.WETHToken();
//   console.log("WETH Token Address:");
//   console.log(wethAddress);
//   const WETHContract = await WETHFactory.attach(wethAddress);
//   console.log("WETH Token Address:");
//   console.log(WETHContract.address);

}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });