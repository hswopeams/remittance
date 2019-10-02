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
    let alice,bob,carol;
    let passwordBob;
    let passwordCarol;
  
  
    // Runs before all tests in this block.
    before("setting up test data", async () => {
        //Set up accounts for parties. In truffel owner = accounts[0]. In this case, Alice is the owner
        [alice,bob,carol] = accounts; 
        passwordBob = "w5S2hsdN";//generated using random.org
        passwordCarol = "mUTD2PDG"//generated using random.org
  
        assert.isAtLeast(accounts.length,3);
    });

     //Run before each test case
     beforeEach("deploying new instance", async () => {
        instance = await Remittance.new(accounts[2], { from: alice });
    });

    it('should have starting balance of 0', async () => {
        const contractBalance = await web3.eth.getBalance(instance.address);
        assert.strictEqual(contractBalance, '0',"contract balance isn't 0");
    });
  
    it('should allow Alice to store hash passwords', async () => {
        const hashedPassword1 = web3.utils.soliditySha3(passwordBob);
        const hashedPassword2 = web3.utils.soliditySha3(passwordCarol);
        const result = await instance.storeHashedPasswords.call(hashedPassword1, hashedPassword2, {from: alice}); 
        assert.isTrue(result, "Function did not return true");
    });

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

    it('should allow Carol to withdraw funds from her escrow account if she and Bob provide the correct passwords', async () => {
        const hashedPassword1 = web3.utils.soliditySha3(passwordBob);
        const hashedPassword2 = web3.utils.soliditySha3(passwordCarol);
        await instance.storeHashedPasswords(hashedPassword1, hashedPassword2, {from: alice}); 
        
        
        let  escrow = await instance.escrow();
        const startingEscrowBalance = escrow.amount;
        const expectedBalance = startingEscrowBalance.add(new BN(2500));
    
        await instance.initiateTransfer({from: alice, value: 2500});
        escrow = await instance.escrow();
        const newEscrowBalance = escrow.amount;

        expect(newEscrowBalance).to.eq.BN(expectedBalance);

        const txObj = await instance.withdrawFunds(passwordBob, passwordCarol, {from: carol});
        
        truffleAssert.eventEmitted(txObj.receipt, 'LogFundsTransferred', (ev) => {    
            return ev.releasedTo == carol && expect(ev.amount).to.eq.BN(newEscrowBalance);
        });  

        
    
    });
});//end test contract

