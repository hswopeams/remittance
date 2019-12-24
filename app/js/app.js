const Web3 = require("web3");
const Promise = require("bluebird");
const truffleContract = require("truffle-contract");
const $ = require("jquery");
// Not to forget our built contract
const remittanceJson = require("../../build/contracts/Remittance.json");
require("file-loader?name=../index.html!../index.html");
require("file-loader?name=../exchangeshop.html!../exchangeshop.html");

// Supports Metamask, and other wallets that provide / inject 'ethereum' or 'web3'.
if (typeof window.ethereum !== 'undefined' || typeof window.web3 !== 'undefined') {
    // Use the Mist/wallet/Metamask provider.
    window.web3 = new Web3(window.ethereum || window.web3.currentProvider);
} else {
    // Your preferred fallback.
    console.log("setting wet3 provider to http://localhost:8545");
    //window.web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:9545')); 
    window.web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
}

const Remittance = truffleContract(remittanceJson);
Remittance.setProvider(web3.currentProvider);

window.addEventListener('load', async function() {
    try {
        const accounts = await (/*window.ethereum ?
            window.enable() ||*/
            web3.eth.getAccounts());
        if (accounts.length == 0) {
            throw new Error("No account with which to transact");
        }
        window.account = accounts[0];
        const network = await web3.eth.net.getId();
        const instance = await Remittance.deployed();

        const escrow = await instance.escrow();
        $("#balanceEscrow").html(escrow.amount.toString(10));

        //Set up Carol
        const carol = accounts[3];
        const balanceCarol = await web3.eth.getBalance(carol);
        console.log("carol's account", carol);

        //Only displayed on Carol's page
        $("#balanceCarol").html(balanceCarol);

        // We wire it when the system looks in order.
        $("#initiateTransfer").click(initiateTransfer);
        $("#withdraw").click(withdrawFunds);
        
    } catch(err) {
        // Never let an error go unlogged.
        console.error(err);
    }
});
const initiateTransfer = async function() {
    // Sometimes you have to force the gas amount to a value you know is enough because
    // `web3.eth.estimateGas` may get it wrong.
    console.log("inside initiateTransfer");
    const gas = 300000;
    try {
        const accounts = await (/*window.ethereum ?
            window.enable() ||*/
            web3.eth.getAccounts());

        const instance = await Remittance.deployed();
       // const alice = accounts[0];
       
        // We simulate the real call and see whether this is likely to work.
        // No point in wasting gas if we have a likely failure.
        const success = await instance.initiateTransfer.call(
            $("input[name='recipeientAddress']").val(),
            { from: window.account, value: $("input[name='amount']").val(), gas: gas });

        if (!success) {
            throw new Error("The transaction will fail anyway, not sending");
        }

        // Ok, we move onto the proper action.
        const txObj = await instance.initiateTransfer(
            $("input[name='recipeientAddress']").val(),
            { from: window.account, value: $("input[name='amount']").val(), gas: gas })
            //transfer takes time in real life, so we get the txHash immediately while it 
            // is mined.
            .on(
                "transactionHash",
                txHash => $("#status").html("Transaction on the way " + txHash)
            )
            .on('receipt', function(receipt){
                console.log("receipt in on receipt ", receipt);
                console.log("events in on receipt ", receipt.events);

            });
        // Now we got the mined tx.
        const receipt = txObj.receipt;
      
        if (!receipt.status) {
            console.error("Wrong status");
            console.error(receipt);
            $("#status").html("There was an error in the tx execution, status not 1");
        } else if (receipt.logs.length == 0) {
            console.error("Empty logs");
            console.error(receipt);
            $("#status").html("There was an error in the tx execution, missing expected event");
        } else {
            console.log("logs ", receipt.logs[0]);
            $("#status").html("Transfer Initiated");
            $("#displayTransactionId").html("Transaction ID is " +receipt.logs[0].args.transactionID.toString());
        }
        // Make sure we update the UI.
        const escrow = await instance.escrow();
        $("#balanceEscrow").html(escrow.amount.toString(10));

       
    } catch(err) {
        $("#status").html(err.toString());
        console.error(err);
    }
};



const withdrawFunds = async function() {
    // Sometimes you have to force the gas amount to a value you know is enough because
    // `web3.eth.estimateGas` may get it wrong.
    const gas = 300000;

    try {
        const accounts = await (/*window.ethereum ?
            window.enable() ||*/
            web3.eth.getAccounts());
        if (accounts.length == 0) {
            throw new Error("No account with which to transact");
        }

        const instance = await Remittance.deployed();
        const carol = accounts[3];
        console.log("carol's account in withdrawFunds", carol);

        // We simulate the real call and see whether this is likely to work.
        // No point in wasting gas if we have a likely failure.
        const success = await instance.withdrawFunds.call(
            $("input[name='account']").val(),
            $("input[name='transactionID']").val(),
            { from: carol, gas: gas });

        if (!success) {
            throw new Error("The transaction will fail anyway, not sending");
        }

        // Ok, we move onto the proper action.
        const txObj = await instance.withdrawFunds(
            $("input[name='account']").val(),
            $("input[name='transactionID']").val(),
            { from: carol, gas: gas })
            // withdrawFunds takes time in real life, so we get the txHash immediately while it 
            // is mined.
            .on(
                "transactionHash",
                txHash => $("#status").html("Transaction on the way " + txHash)
            );
        // Now we got the mined tx.
        const receipt = txObj.receipt;
        
        if (!receipt.status) {
            console.error("Wrong status");
            console.error(receipt);
            $("#status").html("There was an error in the tx execution, status not 1");
        } else if (receipt.logs.length == 0) {
            console.error("Empty logs");
            console.error(receipt);
            $("#status").html("There was an error in the tx execution, missing expected event");
        } else {
            console.log(receipt.logs[0]);
            $("#status").html("Transfer executed");
        }

        // Make sure we update the UI.
        const escrow = await instance.escrow();
        $("#balanceEscrow").html(escrow.amount.toString(10));

        const balanceCarol = await web3.eth.getBalance(carol);
        $("#balanceCarol").html(balanceCarol.toString(10));
        
    } catch(err) {
        $("#status").html(err.toString());
        console.error(err);
    }
    
};