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
        //Set up accounts for parties. In truffel owner = accounts[0].
        [owner,alice,bob,carol,dan,ellen,frank, safeguard] = accounts; 
  
        assert.isAtLeast(accounts.length,6);

        ZERO_ADDRESS =  '0x0000000000000000000000000000000000000000';
    });

     //Run before each test case
     beforeEach("deploying new instance", async () => {
        instance = await Remittance.new(accounts[3], { from: owner });
    });

    it('should have starting balance of 0', async () => {
        const contractBalance = await web3.eth.getBalance(instance.address);
        assert.strictEqual(contractBalance, '0',"contract balance isn't 0");
    });
  

    it('should allow anyone to initiate a funds trasfer to any other party', async () => {
        let transactionID1;
        let transactionID2;
        let escrow = await instance.escrow();
        const startingEscrowBalance = escrow.amount; 
        let expectedBalance = startingEscrowBalance.add(new BN(2500));
    
        const txObj = await instance.initiateTransfer(ellen, {from: dan, value: 2500});
        
        escrow = await instance.escrow();
        let newEscrowBalance = escrow.amount;

        expect(newEscrowBalance).to.eq.BN(expectedBalance);

        let numTransactions = await instance.numTransactions();
       
        truffleAssert.eventEmitted(txObj.receipt, 'LogTransferInitiated', (ev) => {    
            transactionID1 = ev.transactionID;
            return ev.sender == dan && ev.receiver == ellen && expect(ev.amount).to.eq.BN(2500) && expect(ev.transactionID).to.be.gt.BN(0);
        });    

        let transaction = await instance.transactions(transactionID1);
        assert.equal(transaction.amount, 2500, "Transaction amount isn't 2500");
        assert.equal(transaction.fromAccount, dan, "Transaction fromAcount isn't dan's");
        assert.equal(transaction.toAccount, ellen, "Transaction toAcount isn't ellens's");

        //initiale another transfer
        expectedBalance = newEscrowBalance.add(new BN(1000));

        const txObj2 = await instance.initiateTransfer(frank, {from: bob, value: 1000});
        
        escrow = await instance.escrow();
        newEscrowBalance = escrow.amount;

        expect(newEscrowBalance).to.eq.BN(expectedBalance);

        numTransactions = await instance.numTransactions();

        truffleAssert.eventEmitted(txObj2.receipt, 'LogTransferInitiated', (ev) => {    
            transactionID2 = ev.transactionID;
            return ev.sender == bob && ev.receiver == frank && expect(ev.amount).to.eq.BN(1000) && expect(ev.transactionID).to.be.gt.BN(transactionID1);
        }); 

       
        transaction = await instance.transactions(transactionID2);
        assert.equal(transaction.amount, 1000, "Transaction amount isn't 1000");
        assert.equal(transaction.fromAccount, bob, "Transaction fromAcount isn't bob's");
        assert.equal(transaction.toAccount, frank, "Transaction toAcount isn't franks's");

    
    });


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

        expect(newEscrowBalance).to.eq.BN(expectedEscrowBalance);

        truffleAssert.eventEmitted(txObj2.receipt, 'LogTransferInitiated', (ev) => {    
            transactionID2 = ev.transactionID;
            return ev.sender == alice && ev.receiver == bob && expect(ev.amount).to.eq.BN(1000) && expect(ev.transactionID).to.be.gt.BN(transactionID1);
        }); 

        //Carol withdraws funds associated with transaction ID 1 from escrow account and gives cash to Ellen out-of-process
        const txObj = await instance.withdrawFunds(ellen, transactionID1, {from: carol});
        const withdrawGasPrice = (await web3.eth.getTransaction(txObj.tx)).gasPrice;
        const withdrawTxPrice = withdrawGasPrice * txObj.receipt.gasUsed;

        //Carol's balance after calling withdrawFunds() = Carol's balance before calling withdrawFunds() plus amount withdrawn minus price of calling withdrawFunds()
        let expectedBalanceCarol = startingAccountBalanceCarol.add(new BN(2500)).sub(new BN(withdrawTxPrice));
        let newAccountBalanceCarol = await web3.eth.getBalance(carol);

        expect(new BN(newAccountBalanceCarol)).to.eq.BN(expectedBalanceCarol);
        
        truffleAssert.eventEmitted(txObj.receipt, 'LogFundsTransferred', (ev) => {    
            return ev.releasedTo == carol && expect(ev.amount).to.eq.BN(2500);
        });  

        //Carol withdraws funds associated with transaction ID 2from escrow account and gives cash to Bob out-of-process
        const txObj3 = await instance.withdrawFunds(bob, transactionID2, {from: carol});
        const withdrawGasPrice2 = (await web3.eth.getTransaction(txObj3.tx)).gasPrice;
        const withdrawTxPrice2 = withdrawGasPrice * txObj3.receipt.gasUsed;

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

    it('should functionally delete a transaction after funds have been withdrawn', async () => {
        let transactionID;
        
        //Dan initiates transfer of funds to Ellen
        const txObj1 = await instance.initiateTransfer(ellen, {from: dan, value: 2500});

        truffleAssert.eventEmitted(txObj1.receipt, 'LogTransferInitiated', (ev) => {    
            transactionID = ev.transactionID;
            return ev.sender == dan && ev.receiver == ellen && expect(ev.amount).to.eq.BN(2500) && expect(ev.transactionID).to.be.gt.BN(0);
        }); 

        //Carol withdraws funds associated with transaction ID from escrow account and gives cash to Ellen out-of-process
        const txObj = await instance.withdrawFunds(ellen, transactionID, {from: carol});

        const transaction = await instance.transactions(1);
        assert.equal(transaction.fromAccount, ZERO_ADDRESS, "fromAccount isn't zero address");
        assert.equal(transaction.toAccount, ZERO_ADDRESS, "toAccount isn't zero address");
        expect(transaction.amount).to.eq.BN(0);
    });

    it('should allow public variables to be retrieved with built-in getters', async () => {
        const txObj = await instance.initiateTransfer(ellen, {from: dan, value: 2500});
        const numTransactions = await instance.numTransactions();
        expect(numTransactions).to.eq.BN(1);

        const transaction = await instance.transactions(1);
        assert.equal(transaction.fromAccount, dan, "fromAccount isn't Dan");
        assert.equal(transaction.toAccount, ellen, "toAccount isn't Ellen");
        expect(transaction.amount).to.eq.BN(2500);

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
        await instance.initiateTransfer(ellen, {from: dan, value: 2500});
        let  escrow = await instance.escrow();
        const contractBalance = await web3.eth.getBalance(instance.address);
        const safeguardStartingBalance = await web3.eth.getBalance(safeguard);

        expect(escrow.amount).to.eq.BN(2500);
        expect(escrow.amount).to.eq.BN(contractBalance);

       
        await instance.pause({ from: owner });
        let paused = await instance.paused({ from: owner });
        assert.isTrue(paused, 'the contract is paused');

        
        const txObj =  await instance.safeguardFunds(safeguard);
 
        escrow = await instance.escrow();
       
        const newContractBalance = await web3.eth.getBalance(instance.address);
       
        const safeguardBalance = await web3.eth.getBalance(safeguard);
        const expectedSafeguardBalance = new BN(safeguardStartingBalance).add(new BN(contractBalance));

        expect(escrow.amount).to.eq.BN(0);
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
    });
   

});//end test contract

