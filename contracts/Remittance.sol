pragma solidity >=0.4.25 <0.6.0;

/**
 * @author Heather Swope
 * @title Killable
 * @dev Contract which provides a way for Person A to send funds to Person B via any registered exchange shop (for example a Western Union franchise).
 * The owner of the contract must first register the exchange shop as a participating exchange shop.
 * Person A sends Ether, the exchange shop proprietor exchanges the Ether for a local currency and gives the currency to Person B.
 * Person A initiats the transfer, indicating for whom the funds are intended and assigns the password the recipeient will have to use in order to receive the funds.
 * Person B goes to a registered exchange shop. The exchange shop proprietor withdraws funds. Person B (the recipient) must provide his/her password.
 * The exchange shop proprietor gives Person B cash in local currency, but that happens outside the scope of the Dapp.
 * Any party can remit funds to any other party using any registered eschange shop in this way.
 * Passwords are hashed offline and only stored by the contract.
 * If the contract is "killed", the transactions can be retrieved to keep track of which transactions have not yet been carried out
 */

import '@openzeppelin/contracts/ownership/Ownable.sol';
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./Killable.sol";

contract Remittance is Killable {
    using SafeMath for uint256;

    bytes32 constant nullPassword = 0x0000000000000000000000000000000000000000000000000000000000000000;
    mapping (bytes32 => Transaction) public transactions;
    mapping (address => bool) exchangeShops;

    struct Transaction {
        address payable sender;
        address payable recipient;
        uint256 amount;
    }
    
    event LogTransferInitiated(address indexed sender, address indexed recipient, uint256 amount);
    event LogFundsTransferred(address indexed exchangeShop, uint256 amount);
    event LogExchangeShopRegistered(address indexed exchangeShop);

    constructor() public {
    }

    function() external {
        revert("Fallback function not available");
    }

    function registerExchangeShop(address exchangeShop) public onlyOwner returns (bool) {
        require(exchangeShop != address(0), "Exchange shop is the zero address");
        require(exchangeShops[exchangeShop] != true, "Exchange shop already registered");
        exchangeShops[exchangeShop] = true;
        emit LogExchangeShopRegistered(exchangeShop);
        return true;
    }

    function initiateTransfer(address payable recipient, bytes32 recipientPassword) public payable whenAlive {
        require(recipient != address(0), "Recipient is the zero address");
        require(recipientPassword != nullPassword, "Recipient password is invalid");
        require(transactions[recipientPassword].sender == address(0), "Recipient password has already been used");
        require(msg.value > 0, "No Ether sent");
        transactions[recipientPassword] = Transaction(msg.sender, recipient, msg.value);
        emit LogTransferInitiated(msg.sender, recipient, msg.value);
    }

    function withdrawFunds(string memory recipientPassword) public whenAlive {
            require(exchangeShops[msg.sender] == true, "Exchange shop is not a registered exchange shop");

            bytes32 hashedReecipientPassword = keccak256(abi.encodePacked(recipientPassword));

            require(transactions[hashedReecipientPassword].sender != address(0), "Recipient password not valid");

            Transaction storage transaction = transactions[hashedReecipientPassword];
            uint256 amount = transaction.amount;
            
            require(amount > 0, "Remittance funds not available");
            
            emit LogFundsTransferred(msg.sender, amount);

            /* Functional delete of all values  transaction values except sender.
             * The transaction.sender is used in initiateTransfer to check if a password has been used before
             */
            transactions[hashedReecipientPassword].recipient = address(0);
            transactions[hashedReecipientPassword].amount = 0;

            (bool success, ) = msg.sender.call.value(amount)("");
            require(success, "Transfer failed.");
   
    }
}