// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract TokenBridge is Ownable {
    // event LogETHWrapped(address sender, uint256 amount);
    // event LogETHUnwrapped(address sender, uint256 amount);
    // event Lock(uint8 targetChain, address token, bytes receiver, uint256 amount, uint256 serviceFee);
    // event Unlock(address token, uint256 amount, address receiver);
    event Lock(uint8 targetChain, address token, uint256 amount);
    event Unlock(address token, uint256 amount);

    mapping(address => mapping(address => uint256)) private lockedTokens;

    constructor() {
    }

    function lock(uint8 targetChain, address tokenAddress, uint256 value) public returns (bool success, bytes memory result) {
        require(value > 0, "We need to wrap at least 1 token.");
        (success, result) = tokenAddress.call(abi.encodeWithSelector(ERC20.transferFrom.selector, msg.sender, address(this), value));
        require(success, "Transaction failed. Have you allowed token transfer to this contract?");
        lockedTokens[tokenAddress][msg.sender] += value;

        emit Lock(targetChain, tokenAddress, value);
    }

    function unlock(address tokenAddress, address receiver, uint256 value) public onlyOwner returns (bool success, bytes memory result){
        require(value > 0, "We need to unwrap at least 1 token.");

        require(lockedTokens[tokenAddress][receiver] >= value, "This user hasn't locked this many tokens.");

        (success, result) = tokenAddress.call(abi.encodeWithSelector(ERC20.transfer.selector, receiver, value));
        require(success, "Transaction failed.");
        lockedTokens[tokenAddress][receiver] -= value;

        emit Unlock(tokenAddress, value);
    }
}
