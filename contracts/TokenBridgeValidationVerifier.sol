// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
pragma abicoder v2;

contract TokenBridgeValidationVerifier  {
	bytes32 public DOMAIN_SEPARATOR;
    // bytes32 public constant VERIFY_TYPEHASH = keccak256("Verify(string functionName,address tokenAddress,uint256 amount,uint256 nonce)");
    bytes32 public VERIFY_TYPEHASH;

    constructor() {
    }

    function getChainID() public view returns (uint256) {
        uint256 id;
        assembly {
            id := chainid()
        }
        return id;
    }

    function verify(string memory functionName, address tokenAddress, address receiverAddress, uint32 amount, uint32 nonce, uint8 v, bytes32 r, bytes32 s) view public returns(address){

        bytes32 digest =
            keccak256(
                abi.encodePacked(
                    "\x19\x01",
                    DOMAIN_SEPARATOR,
                    keccak256(
                        abi.encode(
                            VERIFY_TYPEHASH,
                            keccak256(bytes(functionName)),
                            tokenAddress,
                            receiverAddress,
                            amount,
                            nonce
                        )
                    )
                )
            );

        return ecrecover(digest, v, r, s);
    }

}
