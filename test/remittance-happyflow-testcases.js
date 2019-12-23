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
    let owner,alice,bob,carol,dan,ellen,frank;
   // let passwordBob;
    //let passwordCarol;
  
  
    // Runs before all tests in this block.
    before("setting up test data", async () => {
        //Set up accounts for parties. In truffel owner = accounts[0]. In this case, Alice is the owner
        //[alice,bob,carol] = accounts; 
        [owner,alice,bob,carol,dan,ellen,frank] = accounts; 
        //passwordBob = "w5S2hsdN";//generated using random.org
        //passwordCarol = "mUTD2PDG"//generated using random.org
  
        assert.isAtLeast(accounts.length,5);
    });

     //Run before each test case
     beforeEach("deploying new instance", async () => {
        instance = await Remittance.new(accounts[3], { from: owner });
    });

    it('should have starting balance of 0', async () => {
        const contractBalance = await web3.eth.getBalance(instance.address);
        assert.strictEqual(contractBalance, '0',"contract balance isn't 0");
    });
  

    /*
    it('should allow Alice to store hash passwords', async () => {
        const hashedPassword1 = web3.utils.soliditySha3(passwordBob);
        const hashedPassword2 = web3.utils.soliditySha3(passwordCarol);
        const result = await instance.storeHashedPasswords.call(hashedPassword1, hashedPassword2, {from: alice}); 
        assert.isTrue(result, "Function did not return true");
    });
*/
/*
    it('should allow Alice to initiate a funds trasfer', async () => {
        const hashedPassword1 = web3.utils.soliditySha3(passwordBob);
        const hashedPassword2 = web3.utils.soliditySha3(passwordCarol);
        const result = await instance.storeHashedPasswords.call(hashedPassword1, hashedPassword2, {from: alice}); 
        assert.isTrue(result, "Function did not return true");
        
        let  escrow = await instance.escrow();
        const startingEscrowBalance = escrow.amount;
        const expectedBalance = startingEscrowBalance.add(new BN(2500));
    
        const txObj = await instance.initiateTransfer({from: alice, value: 2500});
        escrow = await instance.escrow();
        const newEscrowBalance = escrow.amount;

        expect(newEscrowBalance).to.eq.BN(expectedBalance);

        truffleAssert.eventEmitted(txObj.receipt, 'LogTransferInitiated', (ev) => {    
            return ev.sender == alice && expect(ev.amount).to.eq.BN(newEscrowBalance);
        });    

        
    
    });
    */

    it('should allow anyone to initiate a funds trasfer to any other party', async () => {
        let transactionID1;
        let transactionID2;
        let escrow = await instance.escrow();
        const startingEscrowBalance = escrow.amount; 
        let expectedBalance = startingEscrowBalance.add(new BN(2500));
    
        const txObj = await instance.initiateTransfer(ellen, {from: dan, value: 2500});
        //console.log("txObj = ", txObj);
        //console.log("logs = ", txObj.logs[0]);

        escrow = await instance.escrow();
        let newEscrowBalance = escrow.amount;
        console.log("escrow account holder", escrow.account);

        expect(newEscrowBalance).to.eq.BN(expectedBalance);

        let numTransactions = await instance.numTransactions();
        console.log("numTransactions ", numTransactions);

       
        truffleAssert.eventEmitted(txObj.receipt, 'LogTransferInitiated', (ev) => {    
            transactionID1 = ev.transactionID;
            return ev.sender == dan && ev.receiver == ellen && expect(ev.amount).to.eq.BN(2500) && expect(ev.transactionID).to.be.gt.BN(0);
        });    

        console.log("transactionID1 ", transactionID1)
        let transaction = await instance.transactions(transactionID1);
        //console.log("transaction", transaction);
        assert.equal(transaction.amount, 2500, "Transaction amount isn't 2500");
        assert.equal(transaction.fromAccount, dan, "Transaction fromAcount isn't dan's");
        assert.equal(transaction.toAccount, ellen, "Transaction toAcount isn't ellens's");

        //initiale another transfer
        expectedBalance = newEscrowBalance.add(new BN(1000));

        const txObj2 = await instance.initiateTransfer(frank, {from: bob, value: 1000});
        //console.log("txObj2 = ", txObj2);
        

        escrow = await instance.escrow();
        newEscrowBalance = escrow.amount;

        expect(newEscrowBalance).to.eq.BN(expectedBalance);

        numTransactions = await instance.numTransactions();
        console.log("numTransactions 2", numTransactions);

        truffleAssert.eventEmitted(txObj2.receipt, 'LogTransferInitiated', (ev) => {    
            transactionID2 = ev.transactionID;
            return ev.sender == bob && ev.receiver == frank && expect(ev.amount).to.eq.BN(1000) && expect(ev.transactionID).to.be.gt.BN(transactionID1);
        }); 

        console.log("transactionID2 ", transactionID2)
        transaction = await instance.transactions(transactionID2);
        //console.log("transaction", transaction);
        assert.equal(transaction.amount, 1000, "Transaction amount isn't 1000");
        assert.equal(transaction.fromAccount, bob, "Transaction fromAcount isn't bob's");
        assert.equal(transaction.toAccount, frank, "Transaction toAcount isn't franks's");

    
    });
/*
    it('should allow Carol to withdraw funds from her escrow account if she and Bob provide the correct passwords', async () => {
        const startingAccountBalanceCarol = new BN(await web3.eth.getBalance(carol));
        const hashedPassword1 = web3.utils.soliditySha3(passwordBob);
        const hashedPassword2 = web3.utils.soliditySha3(passwordCarol);
        await instance.storeHashedPasswords(hashedPassword1, hashedPassword2, {from: alice}); 
        
        
        let  escrow = await instance.escrow();
        const startingEscrowBalance = escrow.amount;
        const expectedEscrowBalance = startingEscrowBalance.add(new BN(2500));
    
        await instance.initiateTransfer({from: alice, value: 2500});
        escrow = await instance.escrow();
        const newEscrowBalance = escrow.amount;

        expect(newEscrowBalance).to.eq.BN(expectedEscrowBalance);

        const txObj = await instance.withdrawFunds(passwordBob, passwordCarol, {from: carol});
        const withdrawGasPrice = (await web3.eth.getTransaction(txObj.tx)).gasPrice;
        const withdrawTxPrice = withdrawGasPrice * txObj.receipt.gasUsed;

        //Carol's balance after calling withdrawFunds() = Carol's balance before calling withdrawFunds() plus amount withdrawn minus price of calling withdrawFunds()
        const expectedBalanceCarol = startingAccountBalanceCarol.add(new BN(2500)).sub(new BN(withdrawTxPrice));
        const newAccountBalanceCarol = new BN(await web3.eth.getBalance(carol))

        expect(newAccountBalanceCarol).to.eq.BN(expectedBalanceCarol);
        
        truffleAssert.eventEmitted(txObj.receipt, 'LogFundsTransferred', (ev) => {    
            return ev.releasedTo == carol && expect(ev.amount).to.eq.BN(newEscrowBalance);
        });  
    });
    */


   it('should allow Carol to withdraw funds from her escrow account if her address and the receiver\'s address are valid and the transactionID is valid', async () => {
        let transactionID;
        const startingAccountBalanceCarol = new BN(await web3.eth.getBalance(carol));
        console.log("startingAccountBalanceCarol ", startingAccountBalanceCarol.toString());
        
        let  escrow = await instance.escrow();
        const startingEscrowBalance = escrow.amount;
        const expectedEscrowBalance = startingEscrowBalance.add(new BN(2500));

        //Dan initiates transfer of funds to Ellen
        const txObj1 = await instance.initiateTransfer(ellen, {from: dan, value: 2500});
        escrow = await instance.escrow();
        const newEscrowBalance = escrow.amount;

        expect(newEscrowBalance).to.eq.BN(expectedEscrowBalance);

        truffleAssert.eventEmitted(txObj1.receipt, 'LogTransferInitiated', (ev) => {    
            transactionID = ev.transactionID;
            return ev.sender == dan && ev.receiver == ellen && expect(ev.amount).to.eq.BN(2500) && expect(ev.transactionID).to.be.gt.BN(0);
        }); 

        //Carol withdraws funds associated with transaction ID from escrow account and gives cash to Ellen out-of-process
        const txObj = await instance.withdrawFunds(ellen, transactionID, {from: carol});
        const withdrawGasPrice = (await web3.eth.getTransaction(txObj.tx)).gasPrice;
        const withdrawTxPrice = withdrawGasPrice * txObj.receipt.gasUsed;

        //Carol's balance after calling withdrawFunds() = Carol's balance before calling withdrawFunds() plus amount withdrawn minus price of calling withdrawFunds()
        const expectedBalanceCarol = startingAccountBalanceCarol.add(new BN(2500)).sub(new BN(withdrawTxPrice));
        const newAccountBalanceCarol = await web3.eth.getBalance(carol);

        expect(new BN(newAccountBalanceCarol)).to.eq.BN(expectedBalanceCarol);
        
        truffleAssert.eventEmitted(txObj.receipt, 'LogFundsTransferred', (ev) => {    
            return ev.releasedTo == carol && expect(ev.amount).to.eq.BN(newEscrowBalance);
        });  
    });

    it('should allow Carol to withdraw funds from her escrow account  multiple times for different receivers', async () => {
        let transactionID1;
        let transactionID2;
        const startingAccountBalanceCarol = new BN(await web3.eth.getBalance(carol));
        console.log("startingAccountBalanceCarol ", startingAccountBalanceCarol.toString());
        
        let  escrow = await instance.escrow();
        const startingEscrowBalance = escrow.amount;
        const expectedEscrowBalance = startingEscrowBalance.add(new BN(3500));

        //Dan initiates transfer of funds to Ellen
        const txObj1 = await instance.initiateTransfer(ellen, {from: dan, value: 2500});
        escrow = await instance.escrow();
        let newEscrowBalance = escrow.amount;

        truffleAssert.eventEmitted(txObj1.receipt, 'LogTransferInitiated', (ev) => {    
            transactionID1 = ev.transactionID;
            return ev.sender == dan && ev.receiver == ellen && expect(ev.amount).to.eq.BN(2500) && expect(ev.transactionID).to.be.gt.BN(0);
        }); 

        //Alice initiates transfer of funds to Bob
        const txObj2 = await instance.initiateTransfer(bob, {from: alice, value: 1000});
        escrow = await instance.escrow();
        newEscrowBalance = escrow.amount;

        console.log("newEscrowBalance ", newEscrowBalance.toString());

        expect(newEscrowBalance).to.eq.BN(expectedEscrowBalance);

        truffleAssert.eventEmitted(txObj2.receipt, 'LogTransferInitiated', (ev) => {    
            transactionID2 = ev.transactionID;
            return ev.sender == alice && ev.receiver == bob && expect(ev.amount).to.eq.BN(1000) && expect(ev.transactionID).to.be.gt.BN(transactionID1);
        }); 

        //Carol withdraws funds associated with transaction ID 1 from escrow account and gives cash to Ellen out-of-process
        const txObj = await instance.withdrawFunds(ellen, transactionID1, {from: carol});
        const withdrawGasPrice = (await web3.eth.getTransaction(txObj.tx)).gasPrice;
        const withdrawTxPrice = withdrawGasPrice * txObj.receipt.gasUsed;

        console.log("withdrawTxPrice ", withdrawTxPrice.toString());

        //Carol's balance after calling withdrawFunds() = Carol's balance before calling withdrawFunds() plus amount withdrawn minus price of calling withdrawFunds()
        let expectedBalanceCarol = startingAccountBalanceCarol.add(new BN(2500)).sub(new BN(withdrawTxPrice));
        let newAccountBalanceCarol = await web3.eth.getBalance(carol);

        console.log("newAccountBalanceCarol ", newAccountBalanceCarol.toString());
        console.log("expectedBalanceCarol ", expectedBalanceCarol.toString());
        expect(new BN(newAccountBalanceCarol)).to.eq.BN(expectedBalanceCarol);
        
        truffleAssert.eventEmitted(txObj.receipt, 'LogFundsTransferred', (ev) => {    
            return ev.releasedTo == carol && expect(ev.amount).to.eq.BN(2500);
        });  

        //Carol withdraws funds associated with transaction ID 2from escrow account and gives cash to Bob out-of-process
        const txObj3 = await instance.withdrawFunds(bob, transactionID2, {from: carol});
        const withdrawGasPrice2 = (await web3.eth.getTransaction(txObj3.tx)).gasPrice;
        const withdrawTxPrice2 = withdrawGasPrice * txObj3.receipt.gasUsed;

        console.log("withdrawTxPrice ", withdrawTxPrice.toString());

        //Carol's balance after calling withdrawFunds() = Carol's balance before calling withdrawFunds() plus amount withdrawn minus price of calling withdrawFunds()
        expectedBalanceCarol = new BN(newAccountBalanceCarol).add(new BN(1000)).sub(new BN(withdrawTxPrice2));
        newAccountBalanceCarol = await web3.eth.getBalance(carol);

        console.log("newAccountBalanceCarol ", newAccountBalanceCarol.toString());
        console.log("expectedBalanceCarol ", expectedBalanceCarol.toString());
        expect(new BN(newAccountBalanceCarol)).to.eq.BN(expectedBalanceCarol);
        
        truffleAssert.eventEmitted(txObj3.receipt, 'LogFundsTransferred', (ev) => {    
            return ev.releasedTo == carol && expect(ev.amount).to.eq.BN(1000);
        });  


    });
});//end test contract

