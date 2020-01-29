pragma solidity >=0.4.25 <0.6.0;

/**
 * @author Heather Swope
 * @title Remittance
 * @dev Contract which provides a way for Person A to send funds to Person B via any registered exchange shop (for example a Western Union franchise).
 * The owner of the contract must first register the exchange shop as a participating exchange shop.
 * The owner can allso deregister an exchange shop.
 * Person A sends Ether, the exchange shop proprietor exchanges the Ether for a local currency and gives the currency to Person B.
 * Person A initiats the transfer, indicating for whom the funds are intended, assigns the password the recipeient will have to use in order to receive the funds, and specifies an expiration.
 * Person B goes to a registered exchange shop. The exchange shop proprietor withdraws funds. Person B (the recipient) must provide his/her password.
 * The exchange shop proprietor gives Person B cash in local currency, but that happens outside the scope of the Dapp.
 * Any party can remit funds to any other party using any registered eschange shop in this way.
 * Passwords are hashed using the generateHash function.
 * If the contract is "killed", the transactions can be retrieved to keep track of which transactions have not yet been carried out
 */

import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./Killable.sol";

contract Remittance is Killable {
    using SafeMath for uint256;

    bytes32 constant nullPassword = 0x0000000000000000000000000000000000000000000000000000000000000000;
    mapping (bytes32 => Transaction) public transactions;
    mapping (address => bool) exchangeShops;

    struct Transaction {
        address payable sender;
        uint256 amount;
        uint256 expiration;
    }
    
    event LogTransferInitiated(address indexed sender, uint256 amount, uint256 expiration);
    event LogTransferCancelled(address indexed sender, uint256 amount, uint256 expiration);
    event LogFundsTransferred(address indexed exchangeShop, uint256 amount);
    event LogExchangeShopRegistered(address indexed exchangeShop);
    event LogExchangeShopDeregistered(address indexed exchangeShop);
    

    constructor() public {
    }

    function() external {
        revert("Fallback function not available");
    }

    function registerExchangeShop(address exchangeShop) public onlyOwner returns (bool) {
        require(exchangeShop != address(0), "Exchange shop is the zero address");
        require(!exchangeShops[exchangeShop], "Exchange shop already registered");
        exchangeShops[exchangeShop] = true;
        emit LogExchangeShopRegistered(exchangeShop);
        return true;
    }

    function deregisterExchangeShop(address exchangeShop) public onlyOwner returns (bool) {
        require(exchangeShop != address(0), "Exchange shop is the zero address");
        require(exchangeShops[exchangeShop], "Exchange shop not registered");
        exchangeShops[exchangeShop] = false;
        emit LogExchangeShopDeregistered(exchangeShop);
        return true;
    }

    function initiateTransfer(bytes32 recipientPassword, uint256 expiration) public payable whenAlive {
        require(expiration > now, "Expiration time must be in the future");
        require(recipientPassword != nullPassword, "Recipient password is invalid");
        require(transactions[recipientPassword].sender == address(0), "Recipient password has already been used");
        require(msg.value > 0, "No Ether sent");
        transactions[recipientPassword] = Transaction(msg.sender, msg.value, expiration);
        emit LogTransferInitiated(msg.sender, msg.value, transactions[recipientPassword].expiration);
    }

    function cancelTransfer(bytes32 recipientPassword) public payable whenAlive {
        require(transactions[recipientPassword].sender == msg.sender, "Caller did not initate the transfer or password invalid");
        Transaction storage transaction = transactions[recipientPassword];
        require(isExpired(transaction), "Transaction has not yet expired");

        emit LogTransferCancelled(msg.sender, transaction.amount, transaction.expiration);

        /**
         * Functional delete of transaction values except sender.
         * The transaction.sender is used in initiateTransfer to check if a password has been used before
         */
        transactions[recipientPassword].amount = 0;

        (bool success, ) = msg.sender.call.value(transaction.amount)("");
        require(success, "Transfer failed.");
    }

    function withdrawFunds(string memory recipientPassword) public whenAlive {
        require(exchangeShops[msg.sender], "Exchange shop is not a registered exchange shop");

        bytes32 hashedReecipientPassword = generateHash(recipientPassword);

        require(transactions[hashedReecipientPassword].sender != address(0), "Recipient password not valid");

        Transaction storage transaction = transactions[hashedReecipientPassword];
        uint256 amount = transaction.amount;
        
        require(amount > 0, "Remittance funds not available");
        require(!isExpired(transaction), "Transaction has expired");
        
        emit LogFundsTransferred(msg.sender, amount);
 
        /**
         * Functional delete of transaction values except sender.
         * The transaction.sender is used in initiateTransfer to check if a password has been used before
         */
        transactions[hashedReecipientPassword].amount = 0;

        (bool success, ) = msg.sender.call.value(amount)("");
        require(success, "Transfer failed.");
   
    }

    function generateHash(string memory plainPassword) public view returns (bytes32) {
        bytes memory byteString = bytes(plainPassword);
        require(byteString.length > 0 && byteString[0] != " ", "Password cannot be empty");
        return keccak256(abi.encodePacked(address(this), plainPassword));
    }

    function isExpired(Transaction memory transaction) private view returns (bool) {
        return now > transaction.expiration;
    }
}