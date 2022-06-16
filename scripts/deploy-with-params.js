const hre = require('hardhat')
const ethers = hre.ethers;

async function deployContract(_privateKey, _contractName) {
    await hre.run('compile'); // We are compiling the contracts using subtask
    const wallet = new ethers.Wallet(_privateKey, hre.ethers.provider) // New wallet with the privateKey passed from CLI as param
    console.log('Deploying contracts with the account:', wallet.address); // We are printing the address of the deployer
    console.log('Account balance:', (await wallet.getBalance()).toString()); // We are printing the account balance

    const contractFactory = await ethers.getContractFactory(_contractName, wallet); // Get the contract factory with the signer from the wallet created
    const contract = await contractFactory.deploy();
    console.log('Waiting for contract \''+ _contractName + '\' deployment...');
    console.log('Contract address should be: ', contract.address);
    await contract.deployed();

    console.log('Contract address: ', contract.address);
    console.log('Done!');
}
  
module.exports = deployContract;