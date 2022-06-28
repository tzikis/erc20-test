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

    // event Lock(uint8 targetChain, address token, uint256 amount);
    event Lock(address token, address owner, uint256 amount);
    event Unlock(address token, address owner, uint256 amount);

    mapping(address => mapping(address => uint256)) private lockedTokens;

	bytes32 public DOMAIN_SEPARATOR;

    mapping(address => uint256) public nonces;
    bytes32 public constant VERIFY_TYPEHASH = keccak256("Verify(string functionName,address tokenAddress,uint256 amount,uint256 nonce)");

    constructor() {
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,address verifyingContract)"
                ),
                keccak256(bytes('Tzikis TokenBridge')),
                keccak256(bytes("1")),
                address(this)
            )
        );
    }

    // function lock(uint8 targetChain, address tokenAddress, uint256 value) public returns (bool success, bytes memory result) {
    function lock(address tokenAddress, uint256 amount) public returns (bool success, bytes memory result) {
        require(amount > 0, "We need to wrap at least 1 token.");
        (success, result) = tokenAddress.call(abi.encodeWithSelector(ERC20.transferFrom.selector, msg.sender, address(this), amount));
        require(success, "Transaction failed. Have you allowed token transfer to this contract?");
        lockedTokens[tokenAddress][msg.sender] += amount;

        // emit Lock(targetChain, tokenAddress, value);
        // emit Lock(tokenAddress, value);
        emit Lock(tokenAddress, msg.sender, amount);
    }

    function unlock(address tokenAddress, address receiver, uint256 amount, uint8 v, bytes32 r, bytes32 s) public onlyOwner returns (bool success, bytes memory result){
        require(amount > 0, "We need to unwrap at least 1 token.");

        require(lockedTokens[tokenAddress][receiver] >= amount, "This user hasn't locked this many tokens.");

        // we should actually be verifying the receiver too here
        address verificationAddress = verify("unlock()", tokenAddress, amount, v, r, s);
        require(verificationAddress == owner(), "Signature was not valid");

        (success, result) = tokenAddress.call(abi.encodeWithSelector(ERC20.transfer.selector, receiver, amount));
        require(success, "Transaction failed.");
        lockedTokens[tokenAddress][receiver] -= amount;

        // emit Unlock(tokenAddress, value);
        emit Unlock(tokenAddress, receiver, amount);
    }

    event Mint(bytes _tokenNativeAddress, uint256 _amount, address _receiver);
    event Burn(bytes _tokenNativeAddress, uint256 _amount, address _receiver);

    struct WrappedTokenParams {
        string name;
        string symbol;
    }

    mapping(bytes => address) public tokenAddresses;

    function mint(bytes memory tokenNativeAddress, address receiver, uint256 amount, WrappedTokenParams memory tokenParams, uint8 v, bytes32 r, bytes32 s) public onlyOwner returns (bool success, bytes memory result){
        require(amount > 0, "We need to mint at least 1 token.");

        // we should actually be verifying the token native address too here
        address verificationAddress = verify("mint()", receiver, amount, v, r, s);
        require(verificationAddress == owner(), "Signature was not valid");

        if(tokenAddresses[tokenNativeAddress] == address(0)){
            ERC20PresetMinterPauser newERC20Token = new ERC20PresetMinterPauser(string(abi.encodePacked("Wrapped ",tokenParams.name)),string(abi.encodePacked("W", tokenParams.symbol)));
            tokenAddresses[tokenNativeAddress] = address(newERC20Token);
        }
        (success, result) = tokenAddresses[tokenNativeAddress].call(abi.encodeWithSelector(ERC20PresetMinterPauser.mint.selector, receiver, amount));
        require(success, "Transaction failed. Could not mint new tokens.");
        emit Mint(tokenNativeAddress, amount, receiver);
    }

    function burn(bytes memory tokenNativeAddress, uint256 amount) public returns (bool success, bytes memory result) {
        require(amount > 0, "We need to burn at least 1 token.");

        (success, result) = tokenAddresses[tokenNativeAddress].call(abi.encodeWithSelector(ERC20Burnable.burnFrom.selector, msg.sender, amount));
        require(success, "Transaction failed. Could not burn tokens. Make sure you have enough *approved* tokens to burn.");

        emit Burn(tokenNativeAddress, amount, msg.sender);
    }

    function verify(string memory functionName, address tokenAddress, uint256 amount, uint8 v, bytes32 r, bytes32 s) public returns(address){

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
                            amount,
                            nonces[tokenAddress]++
                        )
                    )
                )
            );

        return ecrecover(digest, v, r, s);
    }


}
