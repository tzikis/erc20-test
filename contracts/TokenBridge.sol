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

        // we should actually be verifying the receiver address too here
        require(verify("burn()", tokenAddress, receiver, amount, nonce, v, r, s) == owner());

        (success, result) = tokenAddress.call(abi.encodeWithSelector(ERC20.transfer.selector, receiver, amount));
        require(success);
        lockedTokens[tokenAddress][receiver] -= amount;

        emit Unlock(tokenAddress, receiver, amount);
    }

// TODO: change order of receiver and amount, you idiot
    event Mint(address _tokenNativeAddress, uint32 _amount, address _receiver);
    event Burn(address _tokenNativeAddress, uint32 _amount, address _receiver, uint32 nonce);

    struct WrappedTokenParams {
        string name;
        string symbol;
    }

    mapping(address => address) public tokenAddresses;

    mapping(address => mapping(uint32 => bool)) public mintingNoncesUsed;

    function mint(address tokenNativeAddress, address receiver, uint32 amount, uint32 nonce, WrappedTokenParams memory tokenParams, uint8 v, bytes32 r, bytes32 s) public onlyOwner returns (bool success, bytes memory result){
        require(amount > 0);

        require(mintingNoncesUsed[receiver][nonce] == false);
        mintingNoncesUsed[receiver][nonce] = true;

        // we should actually be verifying the token native address too here
        require(verify("lock()", tokenNativeAddress, receiver, amount, nonce, v, r, s) == owner());

        if(tokenAddresses[tokenNativeAddress] == address(0)){
            ERC20PresetMinterPauser newERC20Token = new ERC20PresetMinterPauser(string(abi.encodePacked("Wrapped ",tokenParams.name)),string(abi.encodePacked("W", tokenParams.symbol)));
            tokenAddresses[tokenNativeAddress] = address(newERC20Token);
        }
        (success, result) = tokenAddresses[tokenNativeAddress].call(abi.encodeWithSelector(ERC20PresetMinterPauser.mint.selector, receiver, amount));
        require(success);
        emit Mint(tokenNativeAddress, amount, receiver);
    }

    mapping(address => uint32) public burningNonces;

    //the way it's done now is we use the nonnative address as a parameter, which i think is correct.
    //but we should also use a reverse mapping to keep the original token address so that we can show both addresses on the event
    function burn(address tokenNativeAddress, uint32 amount) public returns (bool success, bytes memory result) {
        require(amount > 0);

        (success, result) = tokenAddresses[tokenNativeAddress].call(abi.encodeWithSelector(ERC20Burnable.burnFrom.selector, msg.sender, amount));
        require(success);

        emit Burn(tokenNativeAddress, amount, msg.sender, burningNonces[msg.sender]++);
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
