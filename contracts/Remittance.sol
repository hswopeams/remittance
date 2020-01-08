pragma solidity >=0.4.25 <0.6.0;

/**
 * @author Heather Swope
 * @title Killable
 * @dev Contract which provides a way for Person A to send funds to Person B via any registered exchange shop (for example a Western Union franchise).
 * The owner of the contract must first register the exchange shop as a participating exchange shop and also assign the exchange shop's password.
 * Person A sends Ether, the exchange shop proprietor exchanges the Ether for a local currency and gives the currency to Person B.
 * Person A initiats the transfer, indicating for whom the funds are intended and assignes the password the recipeient will have to use in order to receive the funds.
 * Person B goes to a registered exchange shop. The exchange shop proprietor withdraws funds, providing her own password, a new password chosen by him/her.
 * the recipeint's password, and the transaction ID for verification purposes. The exchange shop proprietor gives Person B cash in local currency, but that happens outside the scope of the Dapp.
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
    bytes32 private hashedPasswordBob;
    bytes32 private hashedPasswordCarol;
    uint256 public numTransactions;
    mapping (uint256 => Transaction) public transactions;
    mapping (address => bytes32) exchangeShops;
    mapping(bytes32 => bool) public isPasswordUsed;

    struct Transaction {
        address payable sender;
        address payable recipient;
        uint256 amount;
        bytes32 recipientHashedPassword;
    }
    
    event LogTransferInitiated(address indexed sender, address indexed recipient, uint256 amount, uint256 transactionID);
    event LogFundsTransferred(address indexed exchangeShop, uint256 amount);
    event LogExchangeShopRegistered(address indexed exchangeShop);

    constructor() public {
    }

    function() external {
        revert("Falback function not available");
    }

    function registerExchangeShop(address exchangeShop, bytes32 exchangeShopPassword) public onlyOwner returns (bool) {
        require(exchangeShop != address(0), "Exchange shop is the zero address");
        require(exchangeShopPassword != nullPassword, "Exchange shop password is invalid");
        require(exchangeShops[exchangeShop] == nullPassword, "Exchange shop already registered");
        require(!isPasswordUsed[exchangeShopPassword], "Exchange shop password has already been used");
        isPasswordUsed[exchangeShopPassword] = true;
        exchangeShops[exchangeShop] = exchangeShopPassword;
        emit LogExchangeShopRegistered(exchangeShop);
        return true;
    }

    function initiateTransfer(address payable recipient, bytes32 recipientPassword) public payable whenAlive {
        require(recipient != address(0), "Recipient is the zero address");
        require(recipientPassword != nullPassword, "Recipient password is invalid");
        require(!isPasswordUsed[recipientPassword], "Recipient password has already been used");
        require(msg.value > 0, "No Ether sent");
        isPasswordUsed[recipientPassword] = true;
        uint256 transactionID = ++numTransactions;
        transactions[transactionID] = Transaction(msg.sender, recipient, msg.value, recipientPassword);
        emit LogTransferInitiated(msg.sender, recipient, msg.value, transactionID);
    }

    modifier onlyCorrectPasswords(
            string memory recipientPassword,
            string memory currrentExchangeShopPassword,
            bytes32 newExchangeShopPassword,
            uint transactionID
        )
        {
            require(bytes(recipientPassword).length > 0 && bytes(currrentExchangeShopPassword).length > 0, "Cannot verify passwords");
            require(!isPasswordUsed[newExchangeShopPassword], "Exchange shop password has already been used");
            bytes32 hashedReecipientPassword = keccak256(abi.encodePacked(recipientPassword));
            bytes32 hashedExchangeShopPassword = keccak256(abi.encodePacked(currrentExchangeShopPassword));
            Transaction storage transaction = transactions[transactionID];
            require(transaction.recipientHashedPassword == hashedReecipientPassword && hashedExchangeShopPassword == exchangeShops[msg.sender], "One or both passwords or transactionID not correct");
            _;
    }

     function withdrawFunds(
            string memory recipientPassword,
            string memory currrentExchangeShopPassword,
            bytes32 newExchangeShopPassword,
            uint transactionID
        )
            public
            whenAlive
            onlyCorrectPasswords(recipientPassword, currrentExchangeShopPassword, newExchangeShopPassword, transactionID)
        {
            Transaction storage transaction = transactions[transactionID];
            uint256 amount = transaction.amount;
            
            require(amount > 0, "Remittance funds not available");
            exchangeShops[msg.sender] = newExchangeShopPassword;
            isPasswordUsed[newExchangeShopPassword] = true;
        
            emit LogFundsTransferred(msg.sender, amount);

            //functional delete. Set values in struct to 0 so funds can't be remitted more than once.
            delete transactions[transactionID];

            (bool success, ) = msg.sender.call.value(amount)("");
            require(success, "Transfer failed.");
   
    }
}