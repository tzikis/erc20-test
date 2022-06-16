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

  const ETHWrapperContract = await ETHWrapperFactory.attach("<Your ETHWrapper address>");

	console.log(ETHWrapperContract.address)  

}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });