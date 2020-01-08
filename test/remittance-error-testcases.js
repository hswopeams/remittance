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
        NULL_PASSWORDS = ['0x0000000000000000000000000000000000000000000000000000000000000000','0x00'];
        
        //Generated using random.org
        PASSWORD_RECIPIENT_1 = "w5S2hsdN";
        PASSWORD_RECIPIENT_2 = "RKH33Trj";
        PASSWORD_EXCHANGE_SHOP_1 = "mUTD2PDG"
        PASSWORD_EXCHANGE_SHOP_2 = "X25WarFX"
        PASSWORD_EXCHANGE_SHOP_3 = "Gqg5DuG2"
        PASSWORD_EXCHANGE_SHOP_4 = "URULzLYB"
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
            "Falback function not available"
        );   
    });

    it('should only allow owner to register an exchange shop', async () => {
        const hashedPassword = web3.utils.soliditySha3(PASSWORD_EXCHANGE_SHOP_1);
        await truffleAssert.reverts(
            instance.registerExchangeShop(carol, hashedPassword, {from: frank}),
            "Ownable: caller is not the owner"
        );        
    });

    it('should only allow an exchange shop to be reistered once', async () => {
        const hashedPassword1= web3.utils.soliditySha3(PASSWORD_EXCHANGE_SHOP_1);
        const hashedPassword2 = web3.utils.soliditySha3(PASSWORD_EXCHANGE_SHOP_2);

        await instance.registerExchangeShop(carol, hashedPassword1, {from: owner}),
        await truffleAssert.reverts(
            instance.registerExchangeShop(carol, hashedPassword2, {from: owner}),
            "Exchange shop already registered"
        );        
    });
    
    it('should revert if exchange shop is zero address when registering', async () => {
        const hashedPassword = web3.utils.soliditySha3(PASSWORD_EXCHANGE_SHOP_1);
        await truffleAssert.reverts(
            instance.registerExchangeShop(ZERO_ADDRESS, hashedPassword, {from: owner}),
            "Exchange shop is the zero address"
        );        
    });

    it('should revert if password is invalid when registering', async () => {
        NULL_PASSWORDS.forEach( async item => {
            await truffleAssert.reverts(
                instance.registerExchangeShop(carol, item, {from: owner}),
                "Exchange shop password is invalid"
            );   
        });
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
        NULL_PASSWORDS.forEach( async item => {
            await truffleAssert.reverts(
                instance.initiateTransfer(bob, item, {from: alice, value: 2500}),
                "Recipient password is invalid"
            );   
        });
    });

    it('should revert if recipient password has already when initiating transfer', async () => {
        const hashedPassword = web3.utils.soliditySha3(PASSWORD_RECIPIENT_1);

        await instance.initiateTransfer(bob, hashedPassword, {from: alice, value: 2500});

        await truffleAssert.reverts(
            instance.initiateTransfer(bob, hashedPassword, {from: alice, value: 2500}),
            "Recipient password has already been used"
        );        
    });


    it('should revert if recipient password is incorrect or empty', async () => {
        const hashedExchangeShopPassword = web3.utils.soliditySha3(PASSWORD_EXCHANGE_SHOP_1);
        const hashedNewxchangeShopPassword = web3.utils.soliditySha3(PASSWORD_EXCHANGE_SHOP_2);
        const hashedRecipientPassword = web3.utils.soliditySha3(PASSWORD_RECIPIENT_1);

        await instance.registerExchangeShop(carol, hashedExchangeShopPassword, {from: owner});
        await instance.initiateTransfer(ellen, hashedRecipientPassword, {from: dan, value: 2500});

        await truffleAssert.reverts(
            instance.withdrawFunds(PASSWORD_RECIPIENT_2, PASSWORD_EXCHANGE_SHOP_1, hashedNewxchangeShopPassword, 1, {from: carol}),
            "One or both passwords or transactionID not correct"
        );      

        await truffleAssert.reverts(
            instance.withdrawFunds(' ', PASSWORD_EXCHANGE_SHOP_1, hashedNewxchangeShopPassword, 1, {from: carol}),
            "One or both passwords or transactionID not correct"
        ); 

        await truffleAssert.reverts(
            instance.withdrawFunds('', PASSWORD_EXCHANGE_SHOP_1, hashedNewxchangeShopPassword, 1, {from: carol}),
            "Cannot verify passwords"
        ); 

    });

    it('should revert if exchange shop password is incorrect or empty', async () => {
        const hashedExchangeShopPassword = web3.utils.soliditySha3(PASSWORD_EXCHANGE_SHOP_1);
        const hashedNewxEchangeShopPassword = web3.utils.soliditySha3(PASSWORD_EXCHANGE_SHOP_2);
        const hashedRecipientPassword = web3.utils.soliditySha3(PASSWORD_RECIPIENT_1);

        await instance.registerExchangeShop(carol, hashedExchangeShopPassword, {from: owner});
        await instance.initiateTransfer(ellen, hashedRecipientPassword, {from: dan, value: 2500});

        await truffleAssert.reverts(
            instance.withdrawFunds(PASSWORD_RECIPIENT_1, PASSWORD_EXCHANGE_SHOP_3, hashedNewxEchangeShopPassword, 1, {from: carol}),
            "One or both passwords or transactionID not correct"
        );      

        await truffleAssert.reverts(
            instance.withdrawFunds(PASSWORD_RECIPIENT_1, ' ', hashedNewxEchangeShopPassword, 1, {from: carol}),
            "One or both passwords or transactionID not correct"
        ); 

        await truffleAssert.reverts(
            instance.withdrawFunds(PASSWORD_RECIPIENT_1, '', hashedNewxEchangeShopPassword, 1, {from: carol}),
            "Cannot verify passwords"
        ); 

    });

    
    it('should revert if transaciotnID is not provided when withdrawing funds', async () => {
        const hashedExchangeShopPassword = web3.utils.soliditySha3(PASSWORD_EXCHANGE_SHOP_1);
        const hashedNewxchangeShopPassword = web3.utils.soliditySha3(PASSWORD_EXCHANGE_SHOP_2);
        const hashedRecipientPassword = web3.utils.soliditySha3(PASSWORD_RECIPIENT_1);

        await instance.registerExchangeShop(carol, hashedExchangeShopPassword, {from: owner});
        await instance.initiateTransfer(ellen, hashedRecipientPassword, {from: dan, value: 2500});  

        await truffleAssert.reverts(
            instance.withdrawFunds(PASSWORD_RECIPIENT_1, PASSWORD_EXCHANGE_SHOP_1, hashedNewxchangeShopPassword, '', {from: carol}),
            "One or both passwords or transactionID not correct"
        ); 
    });

    it('should revert if transaciotnID is not correct when withdrawing funds', async () => {
        const hashedExchangeShopPassword = web3.utils.soliditySha3(PASSWORD_EXCHANGE_SHOP_1);
        const hashedNewxchangeShopPassword = web3.utils.soliditySha3(PASSWORD_EXCHANGE_SHOP_2);
        const hashedRecipientPassword = web3.utils.soliditySha3(PASSWORD_RECIPIENT_1);

        await instance.registerExchangeShop(carol, hashedExchangeShopPassword, {from: owner});
        await instance.initiateTransfer(ellen, hashedRecipientPassword, {from: dan, value: 2500});  

        await truffleAssert.reverts(
            instance.withdrawFunds(PASSWORD_RECIPIENT_1, PASSWORD_EXCHANGE_SHOP_1, hashedNewxchangeShopPassword, 0, {from: carol}),
            "One or both passwords or transactionID not correct"
        ); 
    });

    it('should revert if exchange shop password has arleady been used when withdrawing funds ', async () => {
        const hashedExchangeShopPassword1 = web3.utils.soliditySha3(PASSWORD_EXCHANGE_SHOP_1);
        const hashedNewxchangeShopPassword = web3.utils.soliditySha3(PASSWORD_EXCHANGE_SHOP_3);
        const hashedExchangeShopPassword2 = web3.utils.soliditySha3(PASSWORD_EXCHANGE_SHOP_2);
        const hashedRecipientPassword1= web3.utils.soliditySha3(PASSWORD_RECIPIENT_1);
        const hashedRecipientPassword2 = web3.utils.soliditySha3(PASSWORD_RECIPIENT_2);

        await instance.registerExchangeShop(carol, hashedExchangeShopPassword1, {from: owner});
        await instance.initiateTransfer(ellen, hashedRecipientPassword1, {from: dan, value: 2500});  
        await instance.withdrawFunds(PASSWORD_RECIPIENT_1, PASSWORD_EXCHANGE_SHOP_1, hashedNewxchangeShopPassword, 1, {from: carol});

        await instance.initiateTransfer(ellen, hashedRecipientPassword2, {from: dan, value: 2500});  
        await truffleAssert.reverts(
            instance.withdrawFunds(PASSWORD_RECIPIENT_2, PASSWORD_EXCHANGE_SHOP_2, hashedNewxchangeShopPassword, 2, {from: carol}),
            "Exchange shop password has already been used"
        );       
     });

     it('should not allow certain functions to be called if the contract has been killed', async () => {
        const hashedExchangeShopPassword = web3.utils.soliditySha3(PASSWORD_EXCHANGE_SHOP_1);
        const hashedNewxchangeShopPassword = web3.utils.soliditySha3(PASSWORD_EXCHANGE_SHOP_2);
        const hashedRecipientPassword = web3.utils.soliditySha3(PASSWORD_RECIPIENT_1);   
        await instance.kill({ from: owner });
      
        await truffleAssert.reverts(
            instance.initiateTransfer(ellen, hashedRecipientPassword, {from: dan, value: 2500}),
            "Killable: killed"
        );

        
        await truffleAssert.reverts(
            instance.withdrawFunds(PASSWORD_RECIPIENT_1, PASSWORD_EXCHANGE_SHOP_1, hashedNewxchangeShopPassword, 0, {from: frank}),
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
        await instance.kill({ from: owner });

        await truffleAssert.reverts(
            instance.safeguardFunds(safeguard, {from: carol}),
            "Ownable: caller is not the owner"
        );
        
    });

    it('should revert if safeguard transfer cannot be completed' , async () => {
        await instance.kill({ from: owner });

        await truffleAssert.reverts(
            instance.safeguardFunds(ZERO_ADDRESS, {from: owner}),
            "Address must not be zero address"
        );
        
    });
  
});//end test contract

