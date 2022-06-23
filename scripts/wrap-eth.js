const hre = require("hardhat");

const dotenv = require("dotenv");

dotenv.config({path: __dirname + '/../.env'});
const { INFURA_API_KEY, PRIVATE_KEY, ETHERSCAN_API_KEY } = process.env;


async function main() {

  const ETHWrapperFactory = await hre.ethers.getContractFactory("ETHWrapper");
  const provider = new hre.ethers.providers.InfuraProvider("<network>", "<Infura API KEY>");
  const wallet = new hre.ethers.Wallet("<Private Key>", provider);
  const balance = await wallet.getBalance();
  const wrapValue = hre.ethers.utils.parseEther("1")

  const ETHWrapperContract = await ETHWrapperFactory.attach("<Your ETHWrapper address>");

	const tx = await ETHWrapperContract.wrap({value: wrapValue});
	await tx.wait();
  let contractETHBalance = await provider.getBalance(ETHWrapperContract.address);
  console.log("Contract ETH balance after wrapping:", contractETHBalance.toString());

}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });