pragma solidity >=0.4.25 <0.6.0;

/**
 * @dev Contract which provides a way for Person A to send funds to Person B via Carol's exchange shop.
 * Person A sends Ether, Carol exchanges the Ether for a local currency and gives the currency to Person B.
 * Person A initiats the transfer, indicating for whom the funds are intended.
 * Ether is put in Carol's escrow account. Person B goes to Carol's exchange shop. Carol withdraws funds, providing her own address and
 * the address of the receiver for verification purposes.
 * Carol gives Person B cash in local currency, but that happens outside the scope of the Dapp.
 * This gets rid of the insecure password issue, but begs the question why use the exchange shop at all and not just remit funds to
 * the receivers address.
 * Any party can remit funds to any other party in this way.
 */

import '@openzeppelin/contracts/ownership/Ownable.sol';
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Remittance is Ownable, ReentrancyGuard {
    using SafeMath for uint256;

   // bytes32 private hashedPasswordBob;
    //bytes32 private hashedPasswordCarol;

   /**
    * This account holds funds in escrow for Carol between the time Alice initiates a  tranfer of funds
    * to Bob and the time Carol withdraws funds. Carol and Bob must both provide their passwords in order for the
    * funds to be released to Carol.
    */
    struct Escrow {
        address payable account;
        uint256 amount;
    }

    struct Transaction {
        address payable fromAccount;
        address payable toAccount;
        uint256 amount;
    }

    uint256 public numTransactions;
    mapping (uint256 => Transaction) public transactions;

    Escrow public escrow;
    
    event LogTransferInitiated(address indexed sender, address indexed receiver, uint256 amount, uint256 transactionID);
    event LogFundsTransferred(address indexed releasedTo, uint256 amount);

    constructor(address payable escrowAccountHolder) public payable {
        escrow = Escrow(escrowAccountHolder, 0);
    }

    function() external {
        revert("Falback function not available");
    }

    function initiateTransfer(address payable receiver) public payable {
        require(receiver != address(0), "Receiver is the zero address");
        require(msg.value > 0, "No Ether sent");
        escrow.amount = escrow.amount.add(msg.value);
        numTransactions++;
        uint256 transactionID = numTransactions;
        transactions[transactionID] = Transaction(msg.sender, receiver, msg.value);
        emit LogTransferInitiated(msg.sender, receiver, msg.value, transactionID);
    }


    /* Receiver must verify his identity as the address to whom sender intendend the funds to go. */
    modifier hasValidDetails(address receiver, uint transactionID){
        require(msg.sender != address(0) && receiver != address(0), "Addresses must not be zero address");
        require(msg.sender == escrow.account, "Message sender does not match escrow account holder");
        require(transactionID != 0, "Transaction ID not provided");
        Transaction storage transaction = transactions[transactionID];
        require(transaction.toAccount == receiver, "Receiver address does not match transaction receiver address");
        _;
    }

      /* Funds get remitted to escrow account holder (Carol in this case). Carol gives cash to recipient out-of process. */
     function withdrawFunds(address receiver, uint transactionID) public nonReentrant hasValidDetails(receiver, transactionID) {  
        Transaction storage transaction = transactions[transactionID];
        uint256 amount = transaction.amount;
        
        require(amount > 0 && escrow.amount >= amount, "Remittance funds not available");
       
        escrow.amount = escrow.amount.sub(amount);
       
        emit LogFundsTransferred(escrow.account, amount);
  
        //functional delete. Set values in struct to 0 so funds can't be remitted more than once.
        delete transactions[transactionID];

        (bool success, ) = msg.sender.call.value(amount)("");
        require(success, "Transfer failed.");
       
       
    }
}