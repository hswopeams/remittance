const Remittance = artifacts.require("Remittance");
const chai = require('chai');
const BN = require('bn.js');
const bnChai = require('bn-chai');
chai.use(bnChai(BN));
const assert = chai.assert;
const expect = chai.expect;
const truffleAssert = require('truffle-assertions');
const helper = require("./helpers/truffleTestHelper");

contract("Remittance Error Test", async accounts => {
    let instance;
    let alice,bob,carol;
    let passwordBob;
    let passwordCarol;
    let originalBlock;
    let expiration;
    const SECONDS_IN_DAY = 86400;
    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
    const PASSWORD_RECIPIENT_1 = "w5S2hsdN";
    const PASSWORD_RECIPIENT_2 = "RKH33Trj";
    const INVALID_PASSWORDS = ['0x0000000000000000000000000000000000000000000000000000000000000000','0x00','0x0'];
    
  
  
    // Runs before all tests in this block.
    before("setting up test data", async () => {
        assert.isAtLeast(accounts.length,8);

        //Set up accounts for parties. In truffel owner = accounts[0]. 
        [owner,alice,bob,carol,dan,ellen,frank, safeguard] = accounts; 
        
    });

     //Run before each test case
     beforeEach("deploying new instance", async () => {
        instance = await Remittance.new({ from: owner });

        originalBlock = await web3.eth.getBlock('latest');
        let twentyMinutesLater = new Date(originalBlock.timestamp * 1000);
        twentyMinutesLater.setMinutes(twentyMinutesLater.getMinutes() + 20);
        expiration = Math.floor(twentyMinutesLater.getTime()/1000);
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
       const hashedPassword = await instance.generateHash(PASSWORD_RECIPIENT_1);

        await truffleAssert.reverts(
            instance.initiateTransfer(hashedPassword, expiration, {from: alice}),
            "No Ether sent"
        );        
    });
  

    it('should only allow owner to deregister an exchange shop', async () => {
        await truffleAssert.reverts(
            instance.deregisterExchangeShop(carol, {from: frank}),
            "Ownable: caller is not the owner"
        );        
    });

    it('should only allow a registered exchange shop to be deregistered', async () => {
        await truffleAssert.reverts(
            instance.deregisterExchangeShop(carol, {from: owner}),
            "Exchange shop not registered"
        );        
    });

    it('should revert if password is invlaid when initiating transfer', async () => {
        
        INVALID_PASSWORDS.forEach( async item => {
            await truffleAssert.reverts(
                instance.initiateTransfer(item, expiration, {from: alice, value: 2500}),
                "Recipient password is invalid"
            );   
        });

    });

    it('should revert if recipient password has already been used when initiating transfer from same person', async () => {
        const hashedPassword = await instance.generateHash(PASSWORD_RECIPIENT_1);

        await instance.initiateTransfer(hashedPassword, expiration, {from: alice, value: 2500});

        await truffleAssert.reverts(
            instance.initiateTransfer(hashedPassword, expiration, {from: alice, value: 2500}),
            "Recipient password has already been used"
        );        
    });

    it('should revert if recipient password has already been used when initiating transfer from different person', async () => {
        const hashedPassword = await instance.generateHash(PASSWORD_RECIPIENT_1);
        let tenMinutesLater = new Date(originalBlock.timestamp * 1000);
        tenMinutesLater.setMinutes(tenMinutesLater.getMinutes() + 10);
        let tenMinuteexpiration = Math.floor(tenMinutesLater.getTime()/1000);

        await instance.initiateTransfer(hashedPassword, expiration, {from: alice, value: 2500});

        await truffleAssert.reverts(
            instance.initiateTransfer(hashedPassword, tenMinuteexpiration, {from: dan, value: 1000}),
            "Recipient password has already been used"
        );        
    });


    it('should revert if recipient password is incorrect or empty', async () => {
        const hashedRecipientPassword = await instance.generateHash(PASSWORD_RECIPIENT_1);

        await instance.registerExchangeShop(carol, {from: owner});
        await instance.initiateTransfer(hashedRecipientPassword,expiration, {from: dan, value: 2500});

        await truffleAssert.reverts(
            instance.withdrawFunds(PASSWORD_RECIPIENT_2, {from: carol}),
            "Recipient password not valid"
        );      
        
        await truffleAssert.reverts(
            instance.withdrawFunds(' ', {from: carol}),
            "Password cannot be empty"
        ); 

        await truffleAssert.reverts(
            instance.withdrawFunds('', {from: carol}),
            "Password cannot be empty"
        ); 
        
    });

    it('should revert if the expiration is not in the future when initiating transfer', async () => {
        const hashedPassword = await instance.generateHash(PASSWORD_RECIPIENT_1);

        originalBlock = await web3.eth.getBlock('latest');
        let tenSecondsEarlier = new Date(originalBlock.timestamp * 1000);
        tenSecondsEarlier.setSeconds(tenSecondsEarlier.getSeconds() - 10);
        expiration = Math.floor(tenSecondsEarlier.getTime()/1000);

        await truffleAssert.reverts(
            instance.initiateTransfer(hashedPassword, originalBlock.timestamp, {from: alice, value: 2500}),
            "Expiration time must be in the future"
        );        

        await truffleAssert.reverts(
            instance.initiateTransfer(hashedPassword, expiration, {from: alice, value: 2500}),
            "Expiration time must be in the future"
        ); 
    });

    it('should revert if transaction has not yet expirted when transaction is cancelled', async () => {
        const hashedPassword = await instance.generateHash(PASSWORD_RECIPIENT_1);

        await instance.initiateTransfer(hashedPassword, expiration, {from: alice, value: 2500});
     
        await truffleAssert.reverts(
            instance.cancelTransfer(hashedPassword, {from: alice}),
            "Transaction has not yet expired"
        ); 
    });

    it('should revert if recipeient password is incorrect when transaction is cancelled', async () => {
        const hashedPassword = await instance.generateHash(PASSWORD_RECIPIENT_1);
        const hashedPassword2 = await instance.generateHash(PASSWORD_RECIPIENT_2);

        await instance.initiateTransfer(hashedPassword, expiration, {from: alice, value: 2500});

        const advancement = SECONDS_IN_DAY;
        await helper.advanceTimeAndBlock(advancement);
     
        await truffleAssert.reverts(
            instance.cancelTransfer(hashedPassword2, {from: alice}),
            "Transaction is invalid or has already been cancelled"
        ); 
    });

    it('should revert if transaction has already been cancelled', async () => {
        const hashedPassword = await instance.generateHash(PASSWORD_RECIPIENT_1);

        await instance.initiateTransfer(hashedPassword, expiration, {from: alice, value: 2500});

        const advancement = SECONDS_IN_DAY;
        await helper.advanceTimeAndBlock(advancement);

        await instance.cancelTransfer(hashedPassword, {from: alice});
     
        await truffleAssert.reverts(
            instance.cancelTransfer(hashedPassword, {from: alice}),
            "Transaction is invalid or has already been cancelled"
        ); 
    });
   
    it('should only allow the party who initiated the transfer to cancel the transaction', async () => {
        const hashedPassword = await instance.generateHash(PASSWORD_RECIPIENT_1);

        await instance.initiateTransfer(hashedPassword, expiration, {from: alice, value: 2500});

        const advancement = SECONDS_IN_DAY;
        await helper.advanceTimeAndBlock(advancement);
     
        await truffleAssert.reverts(
            instance.cancelTransfer(hashedPassword, {from: bob}),
            "Caller did not initate the transfer or password invalid"
        ); 
    })

    it('should revert if kill is called before pausing the contract', async () => {
        await truffleAssert.reverts(
            instance.kill({ from: owner }),
            "Pausable: not paused"
        );

        
    });

    it('should not allow certain functions to be called if the contract has been killed', async () => {
        const hashedRecipientPassword = await instance.generateHash(PASSWORD_RECIPIENT_1); 
        await instance.pause();
        await instance.kill({ from: owner });
      
        await truffleAssert.reverts(
            instance.initiateTransfer(hashedRecipientPassword, expiration, {from: dan, value: 2500}),
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

    it('should only allow owner to call safeguardFunds', async () => {
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

    it('should revert if the password to be hashed is empty' , async () => {

        await truffleAssert.reverts(
            instance.generateHash(""),
            "Password cannot be empty"
        );

        await truffleAssert.reverts(
            instance.generateHash("  "),
            "Password cannot be empty"
        );
       
    });
  
   
});//end test contract

