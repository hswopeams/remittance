pragma solidity >=0.4.25 <0.6.0;

/**
 * @dev Contract which provides a way for Alice to send funds to Bob via Carol's exchange shop.
 * Alice sends Ether, Carol exchanges the Ether for a local currency and gives the currency to Bob.
 * Alice gives Bob and Carol each a password that must be revealed in order to do the exchange. Alice initiates the transfer.
 * Ether is put in Carol's escrow account. Bob and Carol both provide their passwords using a GUI. The Ether in escrow is
 * released to Carol. Presumably, Carol gives Bob cash in local currency, but that happens outside the scope of the Dapp.
 * 
 * The passwords are generated using a link to a random.org page. This simulates Alice generating and
 * sending passwords to Bob and Carol.  They are hashed offchain and then stored in hashed format in the contract.
 * 
 * This solution is very insecure (everyone can see the passwords), but I can't think of any other way to do
 * it and still meet the project requirements.
 */

import '@openzeppelin/contracts/ownership/Ownable.sol';
import "@openzeppelin/contracts/math/SafeMath.sol";


contract Remittance is Ownable {
    using SafeMath for uint256;

    bytes32 private hashedPasswordBob;
    bytes32 private hashedPasswordCarol;

    struct Escrow {
        address payable account;
        uint256 amount;
    }

    Escrow public escrow;
    
    event LogTransferInitiated(address indexed sender, uint256 amount);
    event LogFundsTransferred(address indexed releasedTo, uint256 amount);

    constructor(address payable remittanceAccountHolder) public payable {
        escrow = Escrow(remittanceAccountHolder, 0);
    }

    function() external {
        revert("Falback function not available");
    }

    function storeHashedPasswords(bytes32 hashedBob, bytes32 hashedCarol) public onlyOwner returns (bool) {
        hashedPasswordBob = hashedBob;
        hashedPasswordCarol = hashedCarol;
        return true;
    }

    function initiateTransfer() public payable onlyOwner {
        require(msg.value > 0, "No Ether sent");
        escrow.amount = escrow.amount.add(msg.value);
        emit LogTransferInitiated(msg.sender, escrow.amount);

    }

    modifier onlyCorrectPasswords(string  memory password1, string memory password2) {
        require(bytes(password1).length > 0 && bytes(password1).length > 0, "Cannot verify passwords");
        bytes32 hashed1 = keccak256(abi.encodePacked(password1));
        bytes32 hashed2 = keccak256(abi.encodePacked(password2));
        require(hashedPasswordBob == hashed1 && hashedPasswordCarol == hashed2, "One or both passwords not correct");
        _;
    }

     function withdrawFunds(string memory password1, string memory password2) public onlyCorrectPasswords(password1, password2) {
        require(msg.sender == escrow.account, "Message sender does not match escrow account holder");
        uint256 amount = escrow.amount;
        require(amount > 0, "No funds in escrow account");
        escrow.amount = 0;
        hashedPasswordBob = 0;
        hashedPasswordCarol = 0;
        emit LogFundsTransferred(escrow.account, amount);
        msg.sender.transfer(amount);
    }
}