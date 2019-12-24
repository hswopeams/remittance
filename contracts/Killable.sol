pragma solidity >=0.4.25 <0.6.0;

/**
 * @title Killable
 * @dev Contract which provides a way to "kill" a contract without losing the Ether associated with
 * the contract account. The safeguardFunds moves money from the contract's account to the owner's account.
 */

import '@openzeppelin/contracts/ownership/Ownable.sol';
import '@openzeppelin/contracts/lifecycle/Pausable.sol';

contract Killable is Ownable, Pausable  {

    event LogFundsSafeguarded(address indexed recipient, uint256 amount);

    constructor() public payable {
    }

    function safeguardFunds(address payable beneficiary) public onlyOwner whenPaused returns(bool) {
        require(beneficiary != address(0), "Address must not be zero address");
        uint balance = address(this).balance;
        emit LogFundsSafeguarded(beneficiary, balance);
      
        (bool success, ) = beneficiary.call.value(balance)("");
        require(success, "Transfer failed.");
    
    }



}