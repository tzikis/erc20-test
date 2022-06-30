// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";


contract TokenBridge{
    event Lock(uint256 _targetChain, address _token, address _owner, uint32 _amount, uint32 _nonce);
    event Unlock(uint256 _targetChain, address _token, address _owner, uint32 _amount);

	bytes32 public DOMAIN_SEPARATOR;
    // bytes32 public constant VERIFY_TYPEHASH = keccak256("Verify(string functionName,address tokenAddress,uint256 amount,uint256 nonce)");
    bytes32 public constant VERIFY_TYPEHASH = keccak256("Verify(string functionName,uint256 chainId,address tokenAddress,address receiverAddress,uint32 amount,uint32 nonce)");

    address public owner;

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

        owner = msg.sender;
    }

    function getChainID() public view returns (uint256) {
        uint256 id;
        assembly {
            id := chainid()
        }
        return id;
    }

    mapping(address => mapping(address => uint32)) public lockedTokens;
    mapping(address => uint32) public lockingNonces;

    function lock(uint256 targetChain, address tokenAddress, uint32 amount) public returns (bool success, bytes memory result) {
        require(amount > 0);
        require(targetChain != getChainID());

        (success, result) = tokenAddress.call(abi.encodeWithSelector(ERC20.transferFrom.selector, msg.sender, address(this), amount));
        require(success);
        lockedTokens[tokenAddress][msg.sender] += amount;

        emit Lock(targetChain, tokenAddress, msg.sender, amount, lockingNonces[msg.sender]++);
    }

    mapping(address => mapping(uint32 => bool)) public unlockingNoncesUsed;

    function unlock(uint256 targetChain, address tokenAddress, address receiver, uint32 amount, uint32 nonce, uint8 v, bytes32 r, bytes32 s) public returns (bool success, bytes memory result){
        require(amount > 0);
        require(targetChain == getChainID());
        require(lockedTokens[tokenAddress][receiver] >= amount);

        require(unlockingNoncesUsed[receiver][nonce] == false);
        unlockingNoncesUsed[receiver][nonce] = true;

        require(verify("burn()", targetChain, tokenAddress, receiver, amount, nonce, v, r, s) == owner);

        (success, result) = tokenAddress.call(abi.encodeWithSelector(ERC20.transfer.selector, receiver, amount));
        require(success);
        lockedTokens[tokenAddress][receiver] -= amount;

        emit Unlock(targetChain, tokenAddress, receiver, amount);
    }

    event Mint(uint256 _targetChain, address _tokenNativeAddress, address _receiver, uint32 _amount, address _wrappedTokenAddress);
    event Burn(uint256 _targetChain, address _tokenNativeAddress, address _receiver, uint32 _amount, address _wrappedTokenAddress, uint32 nonce);

    struct WrappedTokenParams {
        string name;
        string symbol;
    }

    mapping(address => address) public wrappedTokenAddresses;
    mapping(address => address) public wrappedToNativeTokenAddresses;

    mapping(address => mapping(uint32 => bool)) public mintingNoncesUsed;

    function mint(uint256 targetChain, address tokenNativeAddress, address receiver, uint32 amount, uint32 nonce, WrappedTokenParams memory tokenParams, uint8 v, bytes32 r, bytes32 s) public returns (bytes memory result){
        require(amount > 0);
        require(targetChain == getChainID());

        require(mintingNoncesUsed[receiver][nonce] == false);
        mintingNoncesUsed[receiver][nonce] = true;

        require(verify("lock()", targetChain, tokenNativeAddress, receiver, amount, nonce, v, r, s) == owner);

        address wrappedTokenAddress = wrappedTokenAddresses[tokenNativeAddress];
        if(wrappedTokenAddress == address(0)){
            ERC20PresetMinterPauser newERC20Token = new ERC20PresetMinterPauser(string(abi.encodePacked("Wrapped ",tokenParams.name)),string(abi.encodePacked("W", tokenParams.symbol)));
            wrappedTokenAddress = address(newERC20Token);
            wrappedTokenAddresses[tokenNativeAddress] = wrappedTokenAddress;
            wrappedToNativeTokenAddresses[address(newERC20Token)] = tokenNativeAddress;
        }
        bool success;
        (success, result) = wrappedTokenAddresses[tokenNativeAddress].call(abi.encodeWithSelector(ERC20PresetMinterPauser.mint.selector, receiver, amount));
        require(success);
        emit Mint(targetChain, tokenNativeAddress, receiver, amount, wrappedTokenAddress);
    }

    mapping(address => uint32) public burningNonces;

    //decide if we should use the native or the non-native address here as a parameter
    function burn(uint256 targetChain, address tokenWrappedAddress, uint32 amount) public returns (bool success, bytes memory result) {
        require(amount > 0);
        require(targetChain != getChainID());

        address tokenNativeAddress = wrappedToNativeTokenAddresses[tokenWrappedAddress];

        (success, result) = tokenWrappedAddress.call(abi.encodeWithSelector(ERC20Burnable.burnFrom.selector, msg.sender, amount));
        require(success);

        emit Burn(targetChain, tokenNativeAddress, msg.sender, amount, tokenWrappedAddress, burningNonces[msg.sender]++);
    }

    function verify(string memory functionName, uint256 chainId, address tokenAddress, address receiverAddress, uint32 amount, uint32 nonce, uint8 v, bytes32 r, bytes32 s) view public returns(address){

        bytes32 digest =
            keccak256(
                abi.encodePacked(
                    "\x19\x01",
                    DOMAIN_SEPARATOR,
                    keccak256(
                        abi.encode(
                            VERIFY_TYPEHASH,
                            keccak256(bytes(functionName)),
                            chainId,
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
