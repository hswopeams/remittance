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
        assert.isAtLeast(accounts.length,8);

        //Set up accounts for parties. In truffel owner = accounts[0]. 
        [owner,alice,bob,carol,dan,ellen,frank, safeguard] = accounts; 

        ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
        INVALID_PASSWORDS = ['0x0000000000000000000000000000000000000000000000000000000000000000','0x00','0x0'];
        
        //Generated using random.org
        PASSWORD_RECIPIENT_1 = "w5S2hsdN";
        PASSWORD_RECIPIENT_2 = "RKH33Trj";
    });

     //Run before each test case
     beforeEach("deploying new instance", async () => {
        instance = await Remittance.new();
    });

    it('should revert when the fallback function is called', async () => {
        await truffleAssert.reverts(
            instance.sendTransaction({
                from: alice,
                to: instance
            }),
            "Fallback function not available"
        );   
    });

    it('should only allow owner to register an exchange shop', async () => {
        await truffleAssert.reverts(
            instance.registerExchangeShop(carol, {from: frank}),
            "Ownable: caller is not the owner"
        );        
    });

    it('should only allow an exchange shop to be reistered once', async () => {
        await instance.registerExchangeShop(carol, {from: owner}),
        await truffleAssert.reverts(
            instance.registerExchangeShop(carol, {from: owner}),
            "Exchange shop already registered"
        );        
    });
    
    it('should revert if exchange shop is zero address when registering', async () => {
        await truffleAssert.reverts(
            instance.registerExchangeShop(ZERO_ADDRESS, {from: owner}),
            "Exchange shop is the zero address"
        );        
    });
    
    it('should revert if no ether is sent when initiating transfer', async () => {
        const hashedPassword = web3.utils.soliditySha3(PASSWORD_RECIPIENT_1);
        await truffleAssert.reverts(
            instance.initiateTransfer(bob, hashedPassword, {from: alice}),
            "No Ether sent"
        );        
    });

    it('should revert if recipient is zero address when initiating transfer', async () => {
        const hashedPassword = web3.utils.soliditySha3(PASSWORD_RECIPIENT_1);
        await truffleAssert.reverts(
            instance.initiateTransfer(ZERO_ADDRESS, hashedPassword, {from: alice, value: 2500}),
            "Recipient is the zero address"
        );        
    });

    it('should revert if password is invlaid when initiating transfer', async () => {
        INVALID_PASSWORDS.forEach( async item => {
            await truffleAssert.reverts(
                instance.initiateTransfer(bob, item, {from: alice, value: 2500}),
                "Recipient password is invalid"
            );   
        });

    });

    it('should revert if recipient password has already been used when initiating transfer', async () => {
        const hashedPassword = web3.utils.soliditySha3(PASSWORD_RECIPIENT_1);

        await instance.initiateTransfer(bob, hashedPassword, {from: alice, value: 2500});

        await truffleAssert.reverts(
            instance.initiateTransfer(bob, hashedPassword, {from: alice, value: 2500}),
            "Recipient password has already been used"
        );        
    });


    it('should revert if recipient password is incorrect or empty', async () => {
        const hashedRecipientPassword = web3.utils.soliditySha3(PASSWORD_RECIPIENT_1);

        await instance.registerExchangeShop(carol, {from: owner});
        await instance.initiateTransfer(ellen, hashedRecipientPassword, {from: dan, value: 2500});

        await truffleAssert.reverts(
            instance.withdrawFunds(PASSWORD_RECIPIENT_2, {from: carol}),
            "Recipient password not valid"
        );      
        
        await truffleAssert.reverts(
            instance.withdrawFunds(' ', {from: carol}),
            "Recipient password not valid"
        ); 

        await truffleAssert.reverts(
            instance.withdrawFunds('', {from: carol}),
            "Recipient password not valid"
        ); 
        
    });

    it('should revert if kill is called before pausing the contract', async () => {
        await truffleAssert.reverts(
            instance.kill({ from: owner }),
            "Pausable: not paused"
        );

        
    });

    it('should not allow certain functions to be called if the contract has been killed', async () => {
        const hashedRecipientPassword = web3.utils.soliditySha3(PASSWORD_RECIPIENT_1);   
        await instance.pause();
        await instance.kill({ from: owner });
      
        await truffleAssert.reverts(
            instance.initiateTransfer(ellen, hashedRecipientPassword, {from: dan, value: 2500}),
            "Killable: killed"
        );

        
        await truffleAssert.reverts(
            instance.withdrawFunds(PASSWORD_RECIPIENT_1, {from: frank}),
            "Killable: killed"
        );  
        
    });

    it('should not allow safeguardFunds function to be called if the contract is alive', async () => {
      
        await truffleAssert.reverts(
            instance.safeguardFunds(safeguard, {from: owner}),
            "Killable: alive"
        );
        
    });

    it('should only allow owner to call safeguarFunds', async () => {
        await instance.pause();
        await instance.kill({ from: owner });

        await truffleAssert.reverts(
            instance.safeguardFunds(safeguard, {from: carol}),
            "Ownable: caller is not the owner"
        );
        
    });

    it('should revert if safeguard transfer cannot be completed' , async () => {
        await instance.pause();
        await instance.kill({ from: owner });

        await truffleAssert.reverts(
            instance.safeguardFunds(ZERO_ADDRESS, {from: owner}),
            "Address must not be zero address"
        );
        
    });
});//end test contract

