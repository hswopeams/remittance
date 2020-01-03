const Remittance = artifacts.require("Remittance");
const chai = require('chai');
const BN = require('bn.js');
const bnChai = require('bn-chai');
chai.use(bnChai(BN));
const assert = chai.assert;
const expect = chai.expect;
const truffleAssert = require('truffle-assertions');

contract("Remittance Happy Flow Test", async accounts => {
    let instance;
    let owner,alice,bob,carol,dan,ellen,frank, safeguard;
  
  
    // Runs before all tests in this block.
    before("setting up test data", async () => {
        assert.isAtLeast(accounts.length,8);

        //Set up accounts for parties. In truffel owner = accounts[0].
        [owner,alice,bob,carol,dan,ellen,frank,safeguard] = accounts; 

        ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

        //Generated using random.org
        PASSWORD_RECIPIENT_1 = "w5S2hsdN";
        PASSWORD_RECIPIENT_2 = "RKH33Trj";
        PASSWORD_EXCHANGE_SHOP_1 = "mUTD2PDG"
        PASSWORD_EXCHANGE_SHOP_2 = "X25WarFX"
    });

     //Run before each test case
     beforeEach("deploying new instance", async () => {
        instance = await Remittance.new({ from: owner });
    });

    it('should have starting balance of 0', async () => {
        const contractBalance = await web3.eth.getBalance(instance.address);
        assert.strictEqual(contractBalance, '0',"contract balance isn't 0");
    });

    it('should allow owner to register an exchange shop', async () => {
        const hashedPassword = web3.utils.soliditySha3(PASSWORD_EXCHANGE_SHOP_1);
        const txObj = await instance.registerExchangeShop(carol, hashedPassword, {from: owner});
        truffleAssert.eventEmitted(txObj.receipt, 'LogExchangeShopRegistered', (ev) => {    
            return ev.exchangeShop == carol;
        });    
    });
  
  

    it('should allow anyone to initiate a funds transfer to any other party via any exchange shop', async () => {
        let transactionID1;
        let transactionID2;
        const hashedRecipientPassword1 = web3.utils.soliditySha3(PASSWORD_RECIPIENT_1);
        const hashedRecipientPassword2 = web3.utils.soliditySha3(PASSWORD_RECIPIENT_2);

        const txObj = await instance.initiateTransfer(ellen, hashedRecipientPassword1, {from: dan, value: 2500});
        
        let numTransactions = await instance.numTransactions();
        expect(numTransactions).to.eq.BN(1);
       
        truffleAssert.eventEmitted(txObj.receipt, 'LogTransferInitiated', (ev) => {    
            transactionID1 = ev.transactionID;
            return ev.sender == dan && ev.receiver == ellen && expect(ev.amount).to.eq.BN(2500) && expect(ev.transactionID).to.eq.BN(1);
        });    

        let transaction = await instance.transactions(transactionID1);
        assert.equal(transaction.amount, 2500, "Transaction amount isn't 2500");
        assert.equal(transaction.fromAccount, dan, "Transaction fromAcount isn't dan's");
        assert.equal(transaction.toAccount, ellen, "Transaction toAcount isn't ellens's");
        assert.equal(transaction.password, hashedRecipientPassword1, "Transaction password not equal to hashed recipeient password");

        const txObj2 = await instance.initiateTransfer(frank, hashedRecipientPassword2, {from: bob, value: 1000});
        

        numTransactions = await instance.numTransactions();
        expect(numTransactions).to.eq.BN(2);

        truffleAssert.eventEmitted(txObj2.receipt, 'LogTransferInitiated', (ev) => {    
            transactionID2 = ev.transactionID;
            return ev.sender == bob && ev.receiver == frank && expect(ev.amount).to.eq.BN(1000) && expect(ev.transactionID).to.eq.BN(2);
        }); 

       
        transaction = await instance.transactions(transactionID2);
        assert.equal(transaction.amount, 1000, "Transaction amount isn't 1000");
        assert.equal(transaction.fromAccount, bob, "Transaction fromAcount isn't bob's");
        assert.equal(transaction.toAccount, frank, "Transaction toAcount isn't franks's");
        assert.equal(transaction.password, hashedRecipientPassword2, "Transaction password not equal to hashed recipeient password");
    
    });


   it('should allow an exchange shop proprietor to withdraw funds from contract if her address and the receiver\'s address are valid and the transactionID is valid', async () => {
        let transactionID;
        const hashedExchangeShopPassword = web3.utils.soliditySha3(PASSWORD_EXCHANGE_SHOP_1);
        const hashedRecipientPassword = web3.utils.soliditySha3(PASSWORD_RECIPIENT_1);
        const startingAccountBlanceExchangeShop = new BN(await web3.eth.getBalance(carol));

        //Register Carol as exchange shop proprietor
        const txObj = await instance.registerExchangeShop(carol, hashedExchangeShopPassword);
        truffleAssert.eventEmitted(txObj.receipt, 'LogExchangeShopRegistered', (ev) => {    
            return ev.exchangeShop == carol;
        }); 

        //Dan initiates transfer of funds to Ellen
        await instance.initiateTransfer(ellen, hashedRecipientPassword, {from: dan, value: 2500});

        transactionID = await instance.numTransactions();
    
        //Carol withdraws funds associated with transaction ID from contract and gives cash to Ellen out-of-process
        const txObj1 = await instance.withdrawFunds(PASSWORD_RECIPIENT_1, PASSWORD_EXCHANGE_SHOP_1,transactionID, {from: carol});
        const withdrawGasPrice = (await web3.eth.getTransaction(txObj1.tx)).gasPrice;
        const withdrawTxPrice = withdrawGasPrice * txObj1.receipt.gasUsed;

        //Carol's balance after calling withdrawFunds() = Carol's balance before calling withdrawFunds() plus amount withdrawn minus price of calling withdrawFunds()
        const expectedBalanceExchangeShop = startingAccountBlanceExchangeShop.add(new BN(2500)).sub(new BN(withdrawTxPrice));
        const newAccountBalanceExchangeShop = await web3.eth.getBalance(carol);

        expect(new BN(newAccountBalanceExchangeShop)).to.eq.BN(expectedBalanceExchangeShop);
        
        truffleAssert.eventEmitted(txObj1.receipt, 'LogFundsTransferred', (ev) => {    
            return ev.releasedTo == carol && expect(ev.amount).to.eq.BN(2500);
        });  
        
    });

    it('should allow different exchange shop proprietors to withdraw funds from the contract for different receivers', async () => {
        let transactionID1;
        let transactionID2;
        const hashedExchangeShopPassword1 = web3.utils.soliditySha3(PASSWORD_EXCHANGE_SHOP_1);
        const hashedRecipientPassword1 = web3.utils.soliditySha3(PASSWORD_RECIPIENT_1);
        const startingAccountBlanceExchangeShop1 = new BN(await web3.eth.getBalance(carol));
        const hashedExchangeShopPassword2 = web3.utils.soliditySha3(PASSWORD_EXCHANGE_SHOP_2);
        const hashedRecipientPassword2 = web3.utils.soliditySha3(PASSWORD_RECIPIENT_2);
        const startingAccountBlanceExchangeShop2 = new BN(await web3.eth.getBalance(frank));

        //Register Carol as exchange shop proprietor
        const txObj = await instance.registerExchangeShop(carol, hashedExchangeShopPassword1);

        //Register Frank as exchange shop proprietor
        const txObj1 = await instance.registerExchangeShop(frank, hashedExchangeShopPassword2);

        //Dan initiates transfer of funds to Ellen
        await instance.initiateTransfer(ellen, hashedRecipientPassword1, {from: dan, value: 2500});
        transactionID1 = await instance.numTransactions();
       
        //Alice initiates transfer of funds to Bob
        await instance.initiateTransfer(bob, hashedRecipientPassword2, {from: alice, value: 5000});
        transactionID2= await instance.numTransactions();
       
        //Carol withdraws funds associated with first transaction from contract and gives cash to Ellen out-of-process
        const txObj2 = await instance.withdrawFunds(PASSWORD_RECIPIENT_1, PASSWORD_EXCHANGE_SHOP_1,transactionID1, {from: carol});
        let withdrawGasPrice = (await web3.eth.getTransaction(txObj2.tx)).gasPrice;
        let withdrawTxPrice = withdrawGasPrice * txObj2.receipt.gasUsed;

        //Carol's balance after calling withdrawFunds() = Carol's balance before calling withdrawFunds() plus amount withdrawn minus price of calling withdrawFunds()
        const expectedBalanceExchangeShop1 = startingAccountBlanceExchangeShop1.add(new BN(2500)).sub(new BN(withdrawTxPrice));
        const newAccountBalanceExchangeShop1 = await web3.eth.getBalance(carol);

        expect(new BN(newAccountBalanceExchangeShop1)).to.eq.BN(expectedBalanceExchangeShop1);
        
        truffleAssert.eventEmitted(txObj2.receipt, 'LogFundsTransferred', (ev) => {    
            return ev.releasedTo == carol && expect(ev.amount).to.eq.BN(2500);
        });  
        
        //Frank withdraws funds associated with first transaction from contract and gives cash to Bob out-of-process
        const txObj3 = await instance.withdrawFunds(PASSWORD_RECIPIENT_2, PASSWORD_EXCHANGE_SHOP_2,transactionID2, {from: frank});
        withdrawGasPrice = (await web3.eth.getTransaction(txObj3.tx)).gasPrice;
        withdrawTxPrice = withdrawGasPrice * txObj3.receipt.gasUsed;

        //Frank's balance after calling withdrawFunds() = Franks's balance before calling withdrawFunds() plus amount withdrawn minus price of calling withdrawFunds()
        const expectedBalanceExchangeShop2 = startingAccountBlanceExchangeShop2.add(new BN(5000)).sub(new BN(withdrawTxPrice));
        const newAccountBalanceExchangeShop2 = await web3.eth.getBalance(frank);

        expect(new BN(newAccountBalanceExchangeShop2)).to.eq.BN(expectedBalanceExchangeShop2);
        
        truffleAssert.eventEmitted(txObj3.receipt, 'LogFundsTransferred', (ev) => {    
            return ev.releasedTo == frank && expect(ev.amount).to.eq.BN(5000);
        });  

    });


   
    it('should functionally delete a transaction after funds have been withdrawn', async () => {
        let transactionID;
        const hashedExchangeShopPassword1 = web3.utils.soliditySha3(PASSWORD_EXCHANGE_SHOP_1);
        const hashedRecipientPassword1 = web3.utils.soliditySha3(PASSWORD_RECIPIENT_1);

        //Register Carol as exchange shop proprietor
        const txObj = await instance.registerExchangeShop(carol, hashedExchangeShopPassword1);

        //Dan initiates transfer of funds to Ellen
        await instance.initiateTransfer(ellen, hashedRecipientPassword1, {from: dan, value: 2500});
        transactionID= await instance.numTransactions();

        //Carol withdraws funds associated with transaction ID from escrow account and gives cash to Ellen out-of-process
        const txObj2 = await instance.withdrawFunds(PASSWORD_RECIPIENT_1, PASSWORD_EXCHANGE_SHOP_1,transactionID, {from: carol});

        const transaction = await instance.transactions(transactionID);
        assert.equal(transaction.amount, 0, "Transaction amount isn't 0");
        assert.equal(transaction.fromAccount, ZERO_ADDRESS, "Transaction fromAcount isn't zero address");
        assert.equal(transaction.toAccount, ZERO_ADDRESS, "Transaction toAcount isn't zero address");
        assert.equal(web3.utils.hexToNumberString(transaction.password), web3.utils.hexToNumberString('0x0000000000000000000000000000000000000000000000000000000000000000'), "Transaction password not empty");
    });

  
    it('should allow public variables to be retrieved with built-in getters', async () => {
        const hashedExchangeShopPassword1 = web3.utils.soliditySha3(PASSWORD_EXCHANGE_SHOP_1);
        const hashedRecipientPassword1 = web3.utils.soliditySha3(PASSWORD_RECIPIENT_1);
        await instance.registerExchangeShop(carol, hashedExchangeShopPassword1);

        await instance.initiateTransfer(ellen, hashedRecipientPassword1, {from: dan, value: 2500});
        const numTransactions = await instance.numTransactions();
        expect(numTransactions).to.eq.BN(1);

        const transaction = await instance.transactions(1);
        assert.equal(transaction.fromAccount, dan, "fromAccount isn't Dan");
        assert.equal(transaction.toAccount, ellen, "toAccount isn't Ellen");
        expect(transaction.amount).to.eq.BN(2500);
        assert.equal(web3.utils.hexToNumberString(transaction.password), web3.utils.hexToNumberString(hashedRecipientPassword1), "Transaction password not correct");

    });

    it('should allow owner to pause and unpause the contract', async () => {
       const txObj = await instance.pause({ from: owner });
        let paused = await instance.paused({ from: owner });
        assert.isTrue(paused, 'the contract is paused');

        truffleAssert.eventEmitted(txObj.receipt, 'Paused', (ev) => {
            return ev.account == owner;
        });

        assert.strictEqual(txObj.receipt.logs.length, 1, 'Incorrect number of events emitted');
       
        await instance.unpause({ from: owner });
        paused = await instance.paused();
        assert.isFalse(paused, 'the contract is nnot paused');

        truffleAssert.eventEmitted(txObj.receipt, 'Paused', (ev) => {  
            return ev.account == owner;
        });

        assert.strictEqual(txObj.receipt.logs.length, 1, 'Incorrect number of events emitted');

    });
 
    it('should allow owner to transfer contract balance to a safeguard address when paused', async () => {
        const hashedRecipientPassword1 = web3.utils.soliditySha3(PASSWORD_RECIPIENT_1);

        await instance.initiateTransfer(ellen, hashedRecipientPassword1, {from: dan, value: 2500});

        const contractBalance = await web3.eth.getBalance(instance.address);
        const safeguardStartingBalance = await web3.eth.getBalance(safeguard);

        expect(contractBalance).to.eq.BN(2500);

        await instance.pause({ from: owner });
        let paused = await instance.paused({ from: owner });
        assert.isTrue(paused, 'the contract is paused');

        
        const txObj =  await instance.safeguardFunds(safeguard);
       
        const newContractBalance = await web3.eth.getBalance(instance.address);
        const safeguardBalance = await web3.eth.getBalance(safeguard);
        const expectedSafeguardBalance = new BN(safeguardStartingBalance).add(new BN(contractBalance));

        expect(newContractBalance).to.eq.BN(0);
        expect(safeguardBalance).to.eq.BN(expectedSafeguardBalance);

        truffleAssert.eventEmitted(txObj.receipt, 'LogFundsSafeguarded', (ev) => {    
            return ev.recipient == safeguard && expect(ev.amount).to.eq.BN(contractBalance);
        });  
       
        //check transaction data is still available so funds can be returned to sender accounts
        const transaction = await instance.transactions(await instance.numTransactions());
        assert.equal(transaction.fromAccount, dan, "fromAccount isn't Dan");
        assert.equal(transaction.toAccount, ellen, "toAccount isn't Ellen");
        expect(transaction.amount).to.eq.BN(2500);
        assert.equal(web3.utils.hexToNumberString(transaction.password), web3.utils.hexToNumberString(hashedRecipientPassword1), "Transaction password not correct");
    });
   
});//end test contract

