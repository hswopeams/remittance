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

    it('should revert when the fallback function is called', async () => {
        await truffleAssert.reverts(
            instance.sendTransaction({
                from: alice,
                to: instance
            }),
            "Falback function not available"
        );   
    });

    it('should only allow owner (Alice) to call certain functions', async () => {    
        const hashedPassword1 = web3.utils.soliditySha3("blah");
        const hashedPassword2 = web3.utils.soliditySha3("blah");
        await truffleAssert.reverts(
            instance.storeHashedPasswords(hashedPassword1, hashedPassword2, {from: carol}),
            "Ownable: caller is not the owner"
        );   

        await truffleAssert.reverts(
            instance.initiateTransfer({from: accounts[4], value: 2500}),
            "Ownable: caller is not the owner"
        );        
    });

    
    it('should revert if no ether is sent when initiating transfer', async () => {
        await truffleAssert.reverts(
            instance.initiateTransfer({from: alice}),
            "No Ether sent"
        );        
    });

    it('should only allow Carol to withdraw funds', async () => {
        const hashedPassword1 = web3.utils.soliditySha3(passwordBob);
        const hashedPassword2 = web3.utils.soliditySha3(passwordCarol);

        await instance.storeHashedPasswords(hashedPassword1, hashedPassword2, {from: alice}); 
        await instance.initiateTransfer({from: alice, value: 2500});
     

        await truffleAssert.reverts(
            instance.withdrawFunds(passwordBob, passwordCarol, {from: bob}),
            "Message sender does not match escrow account holder"
        );        
    });

    it('should only allow Carol to withdraw funds if she and Bob provide the correct passwords', async () => {
        const hashedPassword1 = web3.utils.soliditySha3(passwordBob);
        const hashedPassword2 = web3.utils.soliditySha3(passwordCarol);

        await instance.storeHashedPasswords(hashedPassword1, hashedPassword2, {from: alice}); 
        await instance.initiateTransfer({from: alice, value: 2500});
     
        await truffleAssert.reverts(
            instance.withdrawFunds("foo", "bar", {from: carol}),
            "One or both passwords not correct"
        );        
    });
  
    it('should only allow Carol to withdraw funds if a transfer has been initiated', async () => {
        const hashedPassword1 = web3.utils.soliditySha3(passwordBob);
        const hashedPassword2 = web3.utils.soliditySha3(passwordCarol);

        await instance.storeHashedPasswords(hashedPassword1, hashedPassword2, {from: alice}); 
        
        await truffleAssert.reverts(
            instance.withdrawFunds(passwordBob, passwordCarol, {from: carol}),
            "No funds in escrow account"
        );        
    });

    it('should only allow passwords to be used once', async () => {
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

        await truffleAssert.reverts(
            instance.withdrawFunds(passwordBob, passwordCarol, {from: carol}),
            "One or both passwords not correct"
        );   

        
    
    });
  
});//end test contract

