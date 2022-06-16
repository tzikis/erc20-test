require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");

const dotenv = require("dotenv");
dotenv.config({path: __dirname + '/.env'});
const { INFURA_API_KEY, PRIVATE_KEY, ETHERSCAN_API_KEY } = process.env;

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
 module.exports = {
  solidity: "0.8.4",
  networks: {
    rinkeby: {
      url: "https://rinkeby.infura.io/v3/" + INFURA_API_KEY,
      accounts: [PRIVATE_KEY]
    }
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: ETHERSCAN_API_KEY
  }
};

task("deploy", "Deploys the contract", async (taskArgs, hre) => {
  const LimeToken = await hre.ethers.getContractFactory("LimeToken");
  const lime = await LimeToken.deploy();

  await lime.deployed();

  console.log("LimeCoin deployed to:", lime.address);
});

task("deploy-eth-wrapper", "Deploys the contract", async (taskArgs, hre) => {
  const ETHWrapperFactory = await ethers.getContractFactory("ETHWrapper"); // 
  const ETHWrapperContract = await ETHWrapperFactory.deploy();
  console.log('Waiting for ETHWrapperContract deployment...');

  await ETHWrapperContract.deployed();
  
  console.log("ETH Wrapper Contract deployed to:", ETHWrapperContract.address);
});

task("deploy-eth-wrapper-rinkeby", "Deploys the contract", async (taskArgs, hre) => {

  const provider = new hre.ethers.providers.InfuraProvider("rinkeby", INFURA_API_KEY);
  const wallet = new hre.ethers.Wallet(PRIVATE_KEY, provider);
  const balance = await wallet.getBalance();
  
  console.log('Deploying contracts with the account:', wallet.address); // We are printing the address of the deployer
  console.log('Account balance:', (await wallet.getBalance()).toString()); // We are printing the account balance

  const ETHWrapperFactory = await ethers.getContractFactory("ETHWrapper", wallet); // 
  const ETHWrapperContract = await ETHWrapperFactory.deploy();
  console.log('Waiting for ETHWrapperContract deployment...');
  console.log(ETHWrapperContract);

  await ETHWrapperContract.deployed();
  
  console.log("ETH Wrapper Contract deployed to:", ETHWrapperContract.address);
  console.log('Done!');
});

task("deploy-mainnet", "Deploys contract on a provided network")
  .addParam("privateKey", "Please provide the private key")
  .addParam("contract", "Please provide the contract name")
  .setAction(async ({privateKey, contract}) => {
      const deployContract = require("./scripts/deploy-with-params");
      await deployContract(privateKey, contract);
});

// hardhat note lime contract deployed address: 0x5FbDB2315678afecb367f032d93F642f64180aa3
// hardhat note eth wrapper contract deployed address: 0x5FbDB2315678afecb367f032d93F642f64180aa3 ?? same?
// eth wrapper contract on rinkeby 0x853f566b4d8AC770464D01cd7409dB743Fd05Be3