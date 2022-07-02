// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";

contract ECRecoverTest {

	constructor() {

	}

    function getChainID() public view returns (uint256) {
        uint256 id;
        assembly {
            id := chainid()
        }
        return id;
    }

	function verify(bytes32 data, uint8 v, bytes32 r, bytes32 s) public pure returns(address) {

		// bytes memory prefix = "\x19Ethereum Signed Message:\n32";
		// bytes32 prefixedData = keccak256(abi.encodePacked(prefix, data));
		// return ecrecover(prefixedData, v, r, s);
		return ecrecover(data, v, r, s);

	}

	function testStringCall(address tokenAddress) public returns(bool success, bytes memory result, string memory name){
		(success, result) = tokenAddress.call(abi.encodeWithSelector(ERC20.name.selector));
        name = string(result);
        require(success);
	}

}