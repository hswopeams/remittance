const Remittance = artifacts.require("Remittance");
const chai = require('chai');
const BN = require('bn.js');
const bnChai = require('bn-chai');
chai.use(bnChai(BN));
const assert = chai.assert;
const expect = chai.expect;
const truffleAssert = require('truffle-assertions');

contract("Remittance Error Test", async accounts => {
    let instance;
    let alice,bob,carol;
    let passwordBob;
    let passwordCarol;
  
  
    // Runs before all tests in this block.
    before("setting up test data", async () => {
        //Set up accounts for parties. In truffel owner = accounts[0]. 
        [owner,alice,bob,carol,dan,ellen,frank, safeguard] = accounts; 
  
        assert.isAtLeast(accounts.length,6);

        ZERO_ADDRESS =  '0x0000000000000000000000000000000000000000';


    });

     //Run before each test case
     beforeEach("deploying new instance", async () => {
        instance = await Remittance.new(accounts[3], { from: owner });
    });

    it('should revert when the fallback function is called', async () => {
        await truffleAssert.reverts(
            instance.sendTransaction({
                from: alice,
                to: instance
            }),
            "Falback function not available"
        );   
    });

    
    
    it('should revert if no ether is sent when initiating transfer', async () => {
        await truffleAssert.reverts(
            instance.initiateTransfer(bob, {from: alice}),
            "No Ether sent"
        );        
    });

     
    it('should revert if receiver is zero address when initiating transfer', async () => {
        await truffleAssert.reverts(
            instance.initiateTransfer(ZERO_ADDRESS, {from: alice, value: 2500}),
            "Receiver is the zero address"
        );        
    });

    it('should revert if the receiver or message sender are the zero address when withdrawing funds', async () => {
        await truffleAssert.reverts(
            instance.withdrawFunds(ZERO_ADDRESS, 11111, {from: carol}),
            "Addresses must not be zero address"
        );        
    });

    it('should only allow Carol to withdraw funds', async () => {
        await truffleAssert.reverts(
            instance.withdrawFunds(dan, 11111, {from: bob}),
            "Message sender does not match escrow account holder"
        );        
    });
    
    it('should revert if transaciotnID is not provided when withdrawing funds', async () => {
        await truffleAssert.reverts(
            instance.withdrawFunds(dan, 0,{from: carol}),
            "Transaction ID not provided"
        );        
    });

    it('should not allow withdrawal of funds if receiver does not match transaction receiver', async () => {
        let transactionID;
        const txObj = await instance.initiateTransfer(bob, {from: alice, value: 2500});

        truffleAssert.eventEmitted(txObj.receipt, 'LogTransferInitiated', (ev) => {    
            transactionID = ev.transactionID;
            return ev.sender == alice && ev.receiver == bob && expect(ev.amount).to.eq.BN(2500) && expect(ev.transactionID).to.be.gt.BN(0);
        }); 
         
         await truffleAssert.reverts(
             instance.withdrawFunds(dan, transactionID, {from: carol}),
             "Receiver address does not match transaction receiver address"
         );        
     });

     it('should not allow certain functions to be called if the contract is paused', async () => {
        await instance.pause({ from: owner });
      
        await truffleAssert.reverts(
            instance.initiateTransfer(ellen, {from: dan, value: 2500}),
            "Pausable: paused"
        );

        
        await truffleAssert.reverts(
            instance.withdrawFunds(ellen, 1, {from: carol}),
            "Pausable: paused"
        );  
        
    });

    it('should not allow safeguardFunds function to be called if the contract IS NOT paused', async () => {
      
        await truffleAssert.reverts(
            instance.safeguardFunds(safeguard),
            "Pausable: not paused"
        );
        
    });

    it('should only allow owner to call safeguarFunds', async () => {
        await instance.pause({ from: owner });

        await truffleAssert.reverts(
            instance.safeguardFunds(safeguard, {from: carol}),
            "Ownable: caller is not the owner"
        );
        
    });

    it('should revert if safeguard transfer cannot be completed' , async () => {
        await instance.pause({ from: owner });

        await truffleAssert.reverts(
            instance.safeguardFunds(ZERO_ADDRESS, {from: owner}),
            "Address must not be zero address"
        );
        
    });
  
});//end test contract

