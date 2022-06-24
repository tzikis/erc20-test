// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract TokenBridgeNonnative is Ownable {

    event Mint(address _tokenNativeAddress, uint256 _amount, address _receiver);
    event Burn(address _tokenNativeAddress, uint256 _amount, address _receiver);

   mapping(address => mapping(address => uint256)) private mintedTokens;

    constructor() {
    }

    function burn(address tokenNativeAddress, uint256 amount) public returns (bool success, bytes memory result) {
        require(amount > 0, "We need to burn at least 1 token.");

        require(mintedTokens[tokenNativeAddress][msg.sender] >= amount, "This user hasn't minted this many tokens in this chain.");

        // (success, result) = tokenAddress.call(abi.encodeWithSelector(ERC20.transferFrom.selector, msg.sender, address(this), value));
        // require(success, "Transaction failed. Have you allowed token transfer to this contract?");

        emit Burn(tokenNativeAddress, amount, msg.sender);
    }

    function mint(address tokenNativeAddress, address receiver, uint256 amount) public onlyOwner returns (bool success, bytes memory result){
        require(amount > 0, "We need to mint at least 1 token.");


        // (success, result) = tokenNativeAddress.call(abi.encodeWithSelector(ERC20.transfer.selector, receiver, amount));
        // require(success, "Transaction failed.");
        // lockedTokens[tokenNativeAddress][receiver] -= amount;
        mintedTokens[tokenNativeAddress][receiver] += amount;

        emit Mint(tokenNativeAddress, amount, receiver);
    }
}
