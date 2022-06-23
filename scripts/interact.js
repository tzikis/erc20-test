const hre = require("hardhat");


const dotenv = require("dotenv");

dotenv.config({path: __dirname + '/../.env'});
const { INFURA_API_KEY, PRIVATE_KEY, ETHERSCAN_API_KEY } = process.env;

async function main() {

    const provider = new hre.ethers.providers.InfuraProvider("rinkeby", INFURA_API_KEY);
    const wallet = new hre.ethers.Wallet(PRIVATE_KEY, provider);
    let balance = await wallet.getBalance();

    console.log(balance.toString())
    const wrapValue = hre.ethers.utils.parseEther("0.01")

    const ETHWrapperFactory = await hre.ethers.getContractFactory("ETHWrapper", wallet);
    const ETHWrapperContract = await ETHWrapperFactory.attach("0x853f566b4d8AC770464D01cd7409dB743Fd05Be3");

    console.log("ETHWrapper Address:");
    console.log(ETHWrapperContract.address)  

    const WETHFactory = await hre.ethers.getContractFactory("WETH", wallet);
    const wethAddress = await ETHWrapperContract.WETHToken();
    const WETHContract = await WETHFactory.attach(wethAddress);

    console.log("WETH Token Address:");
    console.log(WETHContract.address);

    const tx = await ETHWrapperContract.wrap({value: wrapValue, gasLimit: 10000000});
    await tx.wait();
    let contractETHBalance = await provider.getBalance(ETHWrapperContract.address);
    console.log("Contract ETH balance after wrapping:", contractETHBalance.toString());
      
    console.log("Approving contract for WETH Transfer");
    const approveTx = await WETHContract.approve(ETHWrapperContract.address, wrapValue)
    await approveTx.wait()

    console.log("Unwrapping");
    const unwrapTx = await ETHWrapperContract.unwrap(wrapValue)
    await unwrapTx.wait()

    balance = await WETHContract.balanceOf(wallet.address)
    console.log("Balance after unwrapping:", balance.toString())

    contractETHBalance = await provider.getBalance(ETHWrapperContract.address);
    console.log("Contract ETH balance after unwrapping:", contractETHBalance.toString())

}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });