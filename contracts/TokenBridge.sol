// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract TokenBridge is Ownable {
    event Lock(address token, address owner, uint32 amount, uint32 nonce);
    event Unlock(address token, address owner, uint32 amount);

	bytes32 public DOMAIN_SEPARATOR;
    // bytes32 public constant VERIFY_TYPEHASH = keccak256("Verify(string functionName,address tokenAddress,uint256 amount,uint256 nonce)");
    bytes32 public constant VERIFY_TYPEHASH = keccak256("Verify(string functionName,address tokenAddress,address receiverAddress,uint32 amount,uint32 nonce)");

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

    mapping(address => mapping(address => uint32)) public lockedTokens;
    mapping(address => uint32) public lockingNonces;

    function lock(address tokenAddress, uint32 amount) public returns (bool success, bytes memory result) {
        require(amount > 0);
        (success, result) = tokenAddress.call(abi.encodeWithSelector(ERC20.transferFrom.selector, msg.sender, address(this), amount));
        require(success);
        lockedTokens[tokenAddress][msg.sender] += amount;

        emit Lock(tokenAddress, msg.sender, amount, lockingNonces[msg.sender]++);
    }

    mapping(address => mapping(uint32 => bool)) public unlockingNoncesUsed;

    function unlock(address tokenAddress, address receiver, uint32 amount, uint32 nonce, uint8 v, bytes32 r, bytes32 s) public onlyOwner returns (bool success, bytes memory result){
        require(amount > 0);
        require(lockedTokens[tokenAddress][receiver] >= amount);

        require(unlockingNoncesUsed[receiver][nonce] == false);
        unlockingNoncesUsed[receiver][nonce] = true;

        require(verify("burn()", tokenAddress, receiver, amount, nonce, v, r, s) == owner());

        (success, result) = tokenAddress.call(abi.encodeWithSelector(ERC20.transfer.selector, receiver, amount));
        require(success);
        lockedTokens[tokenAddress][receiver] -= amount;

        emit Unlock(tokenAddress, receiver, amount);
    }

    event Mint(address _tokenNativeAddress, address _receiver, uint32 _amount, address _wrappedTokenAddress);
    event Burn(address _tokenNativeAddress, address _receiver, uint32 _amount, address _wrappedTokenAddress, uint32 nonce);

    struct WrappedTokenParams {
        string name;
        string symbol;
    }

    mapping(address => address) public wrappedTokenAddresses;
    mapping(address => address) public wrappedToNativeTokenAddresses;

    mapping(address => mapping(uint32 => bool)) public mintingNoncesUsed;

    function mint(address tokenNativeAddress, address receiver, uint32 amount, uint32 nonce, WrappedTokenParams memory tokenParams, uint8 v, bytes32 r, bytes32 s) public onlyOwner returns (bool success, bytes memory result){
        require(amount > 0);

        require(mintingNoncesUsed[receiver][nonce] == false);
        mintingNoncesUsed[receiver][nonce] = true;

        require(verify("lock()", tokenNativeAddress, receiver, amount, nonce, v, r, s) == owner());

        if(wrappedTokenAddresses[tokenNativeAddress] == address(0)){
            ERC20PresetMinterPauser newERC20Token = new ERC20PresetMinterPauser(string(abi.encodePacked("Wrapped ",tokenParams.name)),string(abi.encodePacked("W", tokenParams.symbol)));
            wrappedTokenAddresses[tokenNativeAddress] = address(newERC20Token);
            wrappedToNativeTokenAddresses[address(newERC20Token)] = tokenNativeAddress;
        }
        (success, result) = wrappedTokenAddresses[tokenNativeAddress].call(abi.encodeWithSelector(ERC20PresetMinterPauser.mint.selector, receiver, amount));
        require(success);
        emit Mint(tokenNativeAddress, receiver, amount, wrappedTokenAddresses[tokenNativeAddress]);
    }

    mapping(address => uint32) public burningNonces;

    //decide if we should use the native or the non-native address here as a parameter
    function burn(address tokenWrappedAddress, uint32 amount) public returns (bool success, bytes memory result) {
        require(amount > 0);

        address tokenNativeAddress = wrappedToNativeTokenAddresses[tokenWrappedAddress];

        (success, result) = tokenWrappedAddress.call(abi.encodeWithSelector(ERC20Burnable.burnFrom.selector, msg.sender, amount));
        require(success);

        emit Burn(tokenNativeAddress, msg.sender, amount, tokenWrappedAddress, burningNonces[msg.sender]++);
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
