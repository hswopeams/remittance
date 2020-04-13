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
    
    event LogTransferInitiated(address indexed sender, bytes32 hashedRecipientPassword, uint256 amount, uint256 expiration);
    event LogTransferCancelled(address indexed sender, bytes32 hashedRecipientPassword, uint256 amount, uint256 expiration);
    event LogFundsTransferred(address indexed exchangeShop, bytes32 hashedRecipientPassword, uint256 amount);
    event LogExchangeShopRegistered(address indexed exchangeShop);
    event LogExchangeShopDeregistered(address indexed exchangeShop);

    constructor() public {
    }

    function() external {
        revert("Fallback function not available");
    }

    /**
     * Register an exchange shop that can participate in remittances. Only the contract owner may call the function.
     * @param exchangeShop - the address of the exchange shop to be registered
     * @dev stores the address in mapping 'exchangeShops'
     * @return bool returns true if registration is successful
     */
    function registerExchangeShop(address exchangeShop) public onlyOwner returns (bool) {
        require(exchangeShop != address(0), "Exchange shop is the zero address");
        require(!exchangeShops[exchangeShop], "Exchange shop already registered");
        exchangeShops[exchangeShop] = true;
        emit LogExchangeShopRegistered(exchangeShop);
        return true;
    }

    /**
     * Deregister an exchange shop so that it can no longer perticipate in remittances. Only the contract owner may call the function.
     * @param exchangeShop - the address of the exchange shop to be eregistered
     * @dev removes the address from mapping 'exchangeShops'
     * @return bool returns true if dregistration is successful
     */
    function deregisterExchangeShop(address exchangeShop) public onlyOwner returns (bool) {
        require(exchangeShops[exchangeShop], "Exchange shop not registered");
        exchangeShops[exchangeShop] = false;
        emit LogExchangeShopDeregistered(exchangeShop);
        return true;
    }

    /**
     * A user can initiate a transfer of ether that will be remitted to the intended recipeient at an exchange shop.
     * @param hashedRecipientPassword recipient password - determined by transfer initiator
     * @param daysAfter number of days (between 1 and 14) after which the transfer will expire.
     * @dev use generateHash to hash password.
     */
    function initiateTransfer(bytes32 hashedRecipientPassword, uint256 daysAfter) public payable whenAlive {
        require(daysAfter >= 1 && daysAfter <= 14, "Days after must be between 1 and 14");
        require(hashedRecipientPassword != nullPassword, "Recipient password is invalid");
        require(transactions[hashedRecipientPassword].sender == address(0), "Recipient password has already been used");
        require(msg.value > 0, "No Ether sent");
        uint256 expiration = now + (daysAfter * 1 days);
        transactions[hashedRecipientPassword] = Transaction(msg.sender, msg.value, expiration);
        emit LogTransferInitiated(msg.sender, hashedRecipientPassword, msg.value, transactions[hashedRecipientPassword].expiration);
    }

    /**
     * The initiator of a transfer can cancel the transfer if the recipient has not gone to an exchange shop to collect the funds before the expiration.
     * @param hashedRecipientPassword recipient password - determined by transfer initiator
     * @dev use generateHash to hash password
     */
    function cancelTransfer(bytes32 hashedRecipientPassword) public payable whenAlive {
        require(transactions[hashedRecipientPassword].amount != 0, "Transaction is invalid or has already been cancelled");
        require(transactions[hashedRecipientPassword].sender == msg.sender, "Caller did not initate the transfer or password invalid");
        Transaction storage transaction = transactions[hashedRecipientPassword];
        require(now > transaction.expiration, "Transaction has not yet expired");

        emit LogTransferCancelled(msg.sender, hashedRecipientPassword, transaction.amount, transaction.expiration);

        uint amount = transaction.amount;

        /**
         * Functional delete of transaction values except sender.
         * The transaction.sender is used in initiateTransfer to check if a password has been used before
         */
        transactions[hashedRecipientPassword].amount = 0;

        (bool success, ) = msg.sender.call.value(amount)("");
        require(success, "Transfer failed.");
    }

    /**
     * A registered exchange shop can collect either in the name of the reciepient of the funds. The exchange shop then remits fiat currency to recipeient
     * @param plainRecipientPassword plaintext recipient password - determined by transfer initiator and provided by recipient
     */
    function withdrawFunds(bytes32 plainRecipientPassword) public whenAlive {
        require(exchangeShops[msg.sender], "Exchange shop is not a registered exchange shop");

        bytes32 hashedReecipientPassword = generateHash(plainRecipientPassword);

        require(transactions[hashedReecipientPassword].sender != address(0), "Recipient password not valid");

        Transaction storage transaction = transactions[hashedReecipientPassword];
        uint256 amount = transaction.amount;
        
        require(amount > 0, "Remittance funds not available");
        require(now < transaction.expiration, "Transaction has expired");
        
        emit LogFundsTransferred(msg.sender, hashedReecipientPassword, amount);
 
        /**
         * Functional delete of transaction values except sender.
         * The transaction.sender is used in initiateTransfer to check if a password has been used before
         */
        transactions[hashedReecipientPassword].amount = 0;
        transactions[hashedReecipientPassword].expiration = 0;

        (bool success, ) = msg.sender.call.value(amount)("");
        require(success, "Transfer failed.");
   
    }

    /**
     * Hash a plaintext password
     * @param plainPassword the plaintext password to be hashed
     * @return bytes32 returns the hashed password
     */
    function generateHash(bytes32 plainPassword) public view returns (bytes32) {
        require(plainPassword != nullPassword, "Password cannot be empty");
        return keccak256(abi.encodePacked(address(this), plainPassword));
    }

}