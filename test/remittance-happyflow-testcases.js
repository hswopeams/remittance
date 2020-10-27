const Remittance = artifacts.require("Remittance");
const chai = require('chai');
const BN = require('bn.js');
const bnChai = require('bn-chai');
chai.use(bnChai(BN));
const assert = chai.assert;
const expect = chai.expect;
const truffleAssert = require('truffle-assertions');
const helper = require("./helpers/truffleTestHelper");

contract("Remittance Happy Flow Test", async accounts => {
    let instance;
    let owner,alice,bob,carol,dan,ellen,frank, safeguard;
    let date;
    const SECONDS_IN_DAY = 86400;
    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
    const PASSWORD_RECIPIENT_1 = "w5S2hsdN";
    const PASSWORD_RECIPIENT_2 = "RKH33Trj";
  
  
    // Runs before all tests in this block.
    before("setting up test data", async () => {
        assert.isAtLeast(accounts.length,8);

        //Set up accounts for parties. In truffel owner = accounts[0].
        [owner,alice,bob,carol,dan,ellen,frank,safeguard] = accounts;
    });

     //Run before each test case
     beforeEach("deploying new instance", async () => {
        instance = await Remittance.new({ from: owner });

        const transaction = await web3.eth.getTransaction(instance.transactionHash);
        const deploymentBlock = await web3.eth.getBlock(transaction.blockNumber);
        date = new Date(deploymentBlock.timestamp);
    });


    it('should have starting balance of 0', async () => {
        const contractBalance = await web3.eth.getBalance(instance.address);
        assert.strictEqual(contractBalance, '0',"contract balance isn't 0");
    });

    it('should allow owner to register an exchange shop', async () => {
        const txObj = await instance.registerExchangeShop(carol, {from: owner});
        truffleAssert.eventEmitted(txObj.receipt, 'LogExchangeShopRegistered', (ev) => {   
            return ev.exchangeShop == carol;
        });    

        assert.strictEqual(txObj.receipt.logs.length, 1, 'Incorrect number of events emitted');
    });

    it('should allow owner to deregister an exchange shop', async () => {
        await instance.registerExchangeShop(carol, {from: owner});
        const txObj = await instance.deregisterExchangeShop(carol, {from: owner});
        truffleAssert.eventEmitted(txObj.receipt, 'LogExchangeShopDeregistered', (ev) => {    
            return ev.exchangeShop == carol;
        });    

        assert.strictEqual(txObj.receipt.logs.length, 1, 'Incorrect number of events emitted');
    });


    it('should allow anyone to initiate a funds transfer to any other party via any exchange shop', async () => {
        const hashedRecipientPassword1 = await instance.generateHash(web3.utils.toHex(PASSWORD_RECIPIENT_1), {from: dan});
        const hashedRecipientPassword2 = await instance.generateHash(web3.utils.toHex(PASSWORD_RECIPIENT_2), {from: dan});

        const daysAfter = 1;

        const txObj = await instance.initiateTransfer(hashedRecipientPassword1, daysAfter, {from: dan, value: 2500});
       
        truffleAssert.eventEmitted(txObj.receipt, 'LogTransferInitiated', (ev) => {
            return ev.sender == dan && expect(ev.amount).to.eq.BN(2500) && ev.hashedRecipientPassword == hashedRecipientPassword1 && ev.expiration > date.getTime();
        });  
        
        assert.strictEqual(txObj.receipt.logs.length, 1, 'Incorrect number of events emitted');

        const transaction1 = await instance.transactions(hashedRecipientPassword1);
        assert.equal(transaction1.amount, 2500, "Transaction amount isn't 2500");
        assert.equal(transaction1.sender, dan, "Transaction sender isn't dan's");

        const txObj2 = await instance.initiateTransfer(hashedRecipientPassword2, daysAfter, {from: bob, value: 1000});


        truffleAssert.eventEmitted(txObj2.receipt, 'LogTransferInitiated', (ev) => {
            return ev.sender == bob && expect(ev.amount).to.eq.BN(1000) && ev.hashedRecipientPassword == hashedRecipientPassword2 && ev.expiration > date.getTime();
        }); 

        assert.strictEqual(txObj2.receipt.logs.length, 1, 'Incorrect number of events emitted');

       
        const transaction2 = await instance.transactions(hashedRecipientPassword2);
        assert.equal(transaction2.amount, 1000, "Transaction amount isn't 1000");
        assert.equal(transaction2.sender, bob, "Transaction fromAcount isn't bob's");
    
    });


   it('should allow an exchange shop proprietor to withdraw funds from the contract if the recipeient\'s password is valid', async () => {
        const hashedRecipientPassword = await instance.generateHash(web3.utils.toHex(PASSWORD_RECIPIENT_1), {from: dan});
        const startingAccountBlanceExchangeShop = new BN(await web3.eth.getBalance(carol));
        const daysAfter = 1;

        //Register Carol as exchange shop proprietor
        const txObj = await instance.registerExchangeShop(carol, {from:owner});
        truffleAssert.eventEmitted(txObj.receipt, 'LogExchangeShopRegistered', (ev) => {    
            return ev.exchangeShop == carol;
        }); 

        assert.strictEqual(txObj.receipt.logs.length, 1, 'Incorrect number of events emitted');

        //Dan initiates transfer of funds to Ellen
        await instance.initiateTransfer(hashedRecipientPassword, daysAfter, {from: dan, value: 2500});
    
        //Carol withdraws funds associated with transaction ID from contract and gives cash to Ellen out-of-process
        const txObj1 = await instance.withdrawFunds(hashedRecipientPassword, {from: carol});
        const withdrawGasPrice = (await web3.eth.getTransaction(txObj1.tx)).gasPrice;
        const withdrawTxPrice = withdrawGasPrice * txObj1.receipt.gasUsed;

        //Carol's balance after calling withdrawFunds() = Carol's balance before calling withdrawFunds() plus amount withdrawn minus price of calling withdrawFunds()
        const expectedBalanceExchangeShop = startingAccountBlanceExchangeShop.add(new BN(2500)).sub(new BN(withdrawTxPrice));
        const newAccountBalanceExchangeShop = await web3.eth.getBalance(carol);

        expect(new BN(newAccountBalanceExchangeShop)).to.eq.BN(expectedBalanceExchangeShop);
        
        truffleAssert.eventEmitted(txObj1.receipt, 'LogFundsWithdrawn', (ev) => {    
            return ev.exchangeShop == carol && expect(ev.amount).to.eq.BN(2500) && ev.hashedRecipientPassword == hashedRecipientPassword;
        });  

        assert.strictEqual(txObj1.receipt.logs.length, 1, 'Incorrect number of events emitted');
        
    });

    
    it('should allow different exchange shop proprietors to withdraw funds from the contract for different receivers', async () => {
        const hashedRecipientPassword1 = await instance.generateHash(web3.utils.toHex(PASSWORD_RECIPIENT_1), {from: dan});
        const startingAccountBlanceExchangeShop1 = new BN(await web3.eth.getBalance(carol));
        const hashedRecipientPassword2 = await instance.generateHash(web3.utils.toHex(PASSWORD_RECIPIENT_2), {from: alice});
        const startingAccountBlanceExchangeShop2 = new BN(await web3.eth.getBalance(frank));
        const daysAfter = 1;

        //Register Carol as exchange shop proprietor
        const txObj = await instance.registerExchangeShop(carol, {from: owner});

        //Register Frank as exchange shop proprietor
        const txObj1 = await instance.registerExchangeShop(frank, {from: owner});

        //Dan initiates transfer of funds to Ellen
        await instance.initiateTransfer(hashedRecipientPassword1, daysAfter, {from: dan, value: 2500});
       
        //Alice initiates transfer of funds to Bob
        await instance.initiateTransfer(hashedRecipientPassword2, daysAfter, {from: alice, value: 5000});
       
        //Carol withdraws funds associated with first transaction from contract and gives cash to Ellen out-of-process
        const txObj2 = await instance.withdrawFunds(hashedRecipientPassword1, {from: carol});
        const withdrawGasPriceCarol = (await web3.eth.getTransaction(txObj2.tx)).gasPrice;
        const withdrawTxPriceCarol = withdrawGasPriceCarol * txObj2.receipt.gasUsed;

        //Carol's balance after calling withdrawFunds() = Carol's balance before calling withdrawFunds() plus amount withdrawn minus price of calling withdrawFunds()
        const expectedBalanceExchangeShop1 = startingAccountBlanceExchangeShop1.add(new BN(2500)).sub(new BN(withdrawTxPriceCarol));
        const newAccountBalanceExchangeShop1 = await web3.eth.getBalance(carol);

        expect(new BN(newAccountBalanceExchangeShop1)).to.eq.BN(expectedBalanceExchangeShop1);
        
        truffleAssert.eventEmitted(txObj2.receipt, 'LogFundsWithdrawn', (ev) => {    
            return ev.exchangeShop == carol && expect(ev.amount).to.eq.BN(2500) && ev.hashedRecipientPassword == hashedRecipientPassword1;
        });  

        assert.strictEqual(txObj2.receipt.logs.length, 1, 'Incorrect number of events emitted');
        
        //Frank withdraws funds associated with first transaction from contract and gives cash to Bob out-of-process
        const txObj3 = await instance.withdrawFunds(hashedRecipientPassword2, {from: frank});
        const withdrawGasPriceFrank = (await web3.eth.getTransaction(txObj3.tx)).gasPrice;
        const withdrawTxPriceFrank = withdrawGasPriceFrank * txObj3.receipt.gasUsed;

        //Frank's balance after calling withdrawFunds() = Franks's balance before calling withdrawFunds() plus amount withdrawn minus price of calling withdrawFunds()
        const expectedBalanceExchangeShop2 = startingAccountBlanceExchangeShop2.add(new BN(5000)).sub(new BN(withdrawTxPriceFrank));
        const newAccountBalanceExchangeShop2 = await web3.eth.getBalance(frank);

        expect(new BN(newAccountBalanceExchangeShop2)).to.eq.BN(expectedBalanceExchangeShop2);
        
        truffleAssert.eventEmitted(txObj3.receipt, 'LogFundsWithdrawn', (ev) => {
            return ev.exchangeShop == frank && expect(ev.amount).to.eq.BN(5000) && ev.hashedRecipientPassword == hashedRecipientPassword2;
        });  

        assert.strictEqual(txObj3.receipt.logs.length, 1, 'Incorrect number of events emitted');
    });


   
    it('should functionally delete transaction details except sender after funds have been withdrawn', async () => {
        const hashedRecipientPassword1  = await instance.generateHash(web3.utils.toHex(PASSWORD_RECIPIENT_1), {from: dan});
        const daysAfter = 2;

        //Register Carol as exchange shop proprietor
        const txObj = await instance.registerExchangeShop(carol);

        //Dan initiates transfer of funds to Ellen
        await instance.initiateTransfer(hashedRecipientPassword1, daysAfter, {from: dan, value: 2500});

        //Carol withdraws funds associated with transaction ID from escrow account and gives cash to Ellen out-of-process
        const txObj2 = await instance.withdrawFunds(hashedRecipientPassword1, {from: carol});

        const transaction = await instance.transactions(hashedRecipientPassword1);
        assert.equal(transaction.amount, 0, "Transaction amount isn't 0");
        assert.equal(transaction.sender, dan, "Transaction sender isn't Dan");
        assert.equal(transaction.expiration, 0, "Transaction expiration isn't 0");
    });
 
 
    it('should allow public variables to be retrieved with built-in getters', async () => {
        const hashedRecipientPassword1  = await instance.generateHash(web3.utils.toHex(PASSWORD_RECIPIENT_1), {from: dan});
        const daysAfter = 2;

        await instance.registerExchangeShop(carol);

        await instance.initiateTransfer(hashedRecipientPassword1, daysAfter, {from: dan, value: 2500});
      
        const transaction = await instance.transactions(hashedRecipientPassword1);
        assert.equal(transaction.sender, dan, "sender isn't Dan");
        expect(transaction.amount).to.eq.BN(2500);

    });

    it('should allow owner to pause and unpause the contract', async () => {
        const txObj = await instance.pause({ from: owner });
        const paused = await instance.paused({ from: owner });
        assert.isTrue(paused, 'the contract is paused');
 
        truffleAssert.eventEmitted(txObj.receipt, 'Paused', (ev) => {
            return ev.account == owner;
        });
 
        assert.strictEqual(txObj.receipt.logs.length, 1, 'Incorrect number of events emitted');
        
        await instance.unpause({ from: owner });
        const pausedAgain = await instance.paused({ from: owner });
        assert.isFalse(pausedAgain, 'the contract is nnot paused');
 
        truffleAssert.eventEmitted(txObj.receipt, 'Paused', (ev) => {  
             return ev.account == owner;
        });
 
        assert.strictEqual(txObj.receipt.logs.length, 1, 'Incorrect number of events emitted');
 
     });

    it('should allow owner kill the contract', async () => {
        await instance.pause({ from: owner });
        const txObj = await instance.kill({ from: owner });
        const killed = await instance.isKilled({ from: owner });
        assert.isTrue(killed, 'the contract has not been killed');

        truffleAssert.eventEmitted(txObj.receipt, 'LogKilled', (ev) => {
            return ev.account == owner;
        });

        assert.strictEqual(txObj.receipt.logs.length, 1, 'Incorrect number of events emitted');
 
    });

    it('should allow owner to transfer contract balance to a safeguard address when killed', async () => {
        const hashedRecipientPassword1 = await instance.generateHash(web3.utils.asciiToHex(PASSWORD_RECIPIENT_1), {from: dan});

        const daysAfter = 14;

        await instance.initiateTransfer(hashedRecipientPassword1, daysAfter, {from: dan, value: 2500});

        const contractBalance = await web3.eth.getBalance(instance.address);
        const safeguardStartingBalance = await web3.eth.getBalance(safeguard);

        expect(contractBalance).to.eq.BN(2500);

        await instance.pause({ from: owner });
        await instance.kill({ from: owner });
        const killed = await instance.isKilled({ from: owner });
        assert.isTrue(killed, 'the contract has not been killed');

        const txObj =  await instance.safeguardFunds(safeguard);
       
        const newContractBalance = await web3.eth.getBalance(instance.address);
        const safeguardBalance = await web3.eth.getBalance(safeguard);
        const expectedSafeguardBalance = new BN(safeguardStartingBalance).add(new BN(contractBalance));

        expect(newContractBalance).to.eq.BN(0);
        expect(safeguardBalance).to.eq.BN(expectedSafeguardBalance);

        truffleAssert.eventEmitted(txObj.receipt, 'LogFundsSafeguarded', (ev) => {    
            return ev.recipient == safeguard && expect(ev.amount).to.eq.BN(contractBalance);
        });  

        assert.strictEqual(txObj.receipt.logs.length, 1, 'Incorrect number of events emitted');
       
        //check transaction data is still available so funds can be returned to sender accounts
        const transaction = await instance.transactions(hashedRecipientPassword1);
        assert.equal(transaction.sender, dan, "sender isn't Dan");
        expect(transaction.amount).to.eq.BN(2500);
    });
 

    it('should allow sender to cancel the transfer after expiration time', async () => {
        const hashedRecipientPassword = await instance.generateHash(web3.utils.asciiToHex(PASSWORD_RECIPIENT_1), {from: dan});
        const daysAfter = 1;
       
        const txObj = await instance.initiateTransfer(hashedRecipientPassword, daysAfter, {from: dan, value: 2500});   

        const advancement = SECONDS_IN_DAY + 1;
        await helper.advanceTime(advancement);

        const startingAccountBlanceDan = new BN(await web3.eth.getBalance(dan));

        const txObj2 = await instance.cancelTransfer(hashedRecipientPassword, {from: dan});

        truffleAssert.eventEmitted(txObj2.receipt, 'LogTransferCancelled', (ev) => {
            return ev.sender == dan && expect(ev.amount).to.eq.BN(2500) && ev.hashedRecipientPassword == hashedRecipientPassword && ev.expiration > date.getTime();
        });  
     
        assert.strictEqual(txObj2.receipt.logs.length, 1, 'Incorrect number of events emitted');

        const cancelGasPrice = (await web3.eth.getTransaction(txObj2.tx)).gasPrice;
        const cancelTxPrice = cancelGasPrice * txObj2.receipt.gasUsed;

        //Dan's balance after calling cancelTransfer() = Dan's balance before calling cancelTransfer() plus amount initially transferred minus price of calling cancelTransfer()
        const expectedBalanceDan = startingAccountBlanceDan.add(new BN(2500)).sub(new BN(cancelTxPrice));
        const newAccountBalanceDan = await web3.eth.getBalance(dan);

        expect(new BN(newAccountBalanceDan)).to.eq.BN(expectedBalanceDan);


    });

   it('should generate a hash for a plaintext password', async () => {
    const hexValuePassword = web3.utils.asciiToHex(PASSWORD_RECIPIENT_1);

    const hashedPassword = web3.utils.soliditySha3(
        { value: instance.address, type: "address" },
        { value: hexValuePassword, type: "bytes32" });

    const generatedHash  = await instance.generateHash(hexValuePassword, {from: owner});

    assert.equal(generatedHash, hashedPassword, "Hashes don't match");

});

  
});//end test contract

