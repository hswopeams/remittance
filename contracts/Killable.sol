pragma solidity >=0.4.25 <0.6.0;

/**
 * @author Heather Swope
 * @title Killable
 * @dev Contract which provides a way to "kill" a contract without losing the Ether associated with
 * the contract account. The safeguardFunds moves money from the contract's account to the owner's account.
 */

import '@openzeppelin/contracts/ownership/Ownable.sol';
import '@openzeppelin/contracts/lifecycle/Pausable.sol';

contract Killable is Ownable, Pausable {

    bool private _killed;

    event LogKilled(address account);
    event LogFundsSafeguarded(address indexed recipient, uint256 amount);

    constructor() public {
    }

    function isKilled() public view returns (bool) {
        return _killed;
    }

    function kill() public onlyOwner whenAlive whenPaused {
        _killed = true;
        emit LogKilled(msg.sender);
    }

    modifier whenAlive() {
        require(!_killed, "Killable: killed");
        _;
    }

    modifier whenKilled() {
        require(_killed, "Killable: alive");
        _;
    }


    function safeguardFunds(address payable beneficiary) public onlyOwner whenKilled returns(bool) {
        require(beneficiary != address(0), "Address must not be zero address");
        uint balance = address(this).balance;
        emit LogFundsSafeguarded(beneficiary, balance);
      
        (bool success, ) = beneficiary.call.value(balance)("");
        require(success, "Transfer failed.");
    
    }



}