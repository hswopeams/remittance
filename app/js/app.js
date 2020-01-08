const Web3 = require("web3");
const Promise = require("bluebird");
const truffleContract = require("truffle-contract");
const $ = require("jquery");
// Not to forget our built contract
const remittanceJson = require("../../build/contracts/Remittance.json");
require("file-loader?name=../index.html!../index.html");
require("file-loader?name=../transfer.html!../transfer.html");
require("file-loader?name=../exchangeshop.html!../exchangeshop.html");

// Supports Metamask, and other wallets that provide / inject 'ethereum' or 'web3'.
if (typeof window.ethereum !== 'undefined' || typeof window.web3 !== 'undefined') {
    // Use the Mist/wallet/Metamask provider.
    window.web3 = new Web3(window.ethereum || window.web3.currentProvider);
} else {
    // Your preferred fallback.
    console.log("setting wet3 provider to http://127.0.0.1:8545");
    //window.web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:9545')); 
    window.web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'));
}

const newExchangeShopPassword = web3.utils.randomHex(4);
const Remittance = truffleContract(remittanceJson);
Remittance.setProvider(web3.currentProvider);

window.addEventListener('load', async function() {
    try {
        const accounts = await (/*window.ethereum ?
            window.enable() ||*/
            web3.eth.getAccounts());
            console.log("accounts ", accounts);
        if (accounts.length == 0) {
            throw new Error("No account with which to transact");
        }
        window.account = accounts[0];
        console.log("window.account ", window.account);

        const network = await web3.eth.net.getId();
        const instance = await Remittance.deployed();
        //const newHashedExchangeShopPassword = web3.utils.soliditySha3({t: 'bytes', v: web3.utils.randomHex(4)});

        console.log("newExchangeShopPassword ", newExchangeShopPassword);
 
        $("#balanceContract").html(await web3.eth.getBalance(instance.address));
        $("#newExchangeShopPassword").html(newExchangeShopPassword);

        // We wire it when the system looks in order.
        $("#registerExchangeShop").click(registerExchangeShop);
        $("#initiateTransfer").click(initiateTransfer);
        $("#withdraw").click(withdrawFunds);
        
    } catch(err) {
        // Never let an error go unlogged.
        console.error(err);
    }
});

const registerExchangeShop = async function() {
    // Sometimes you have to force the gas amount to a value you know is enough because
    // `web3.eth.estimateGas` may get it wrong.
    const gas = 300000;
    try {
        const accounts = await (/*window.ethereum ?
            window.enable() ||*/
            web3.eth.getAccounts());
            console.log("accounts ", accounts);
        const instance = await Remittance.deployed();
   
        console.log("passwordExchangeShop ", $("input[name='passwordExchangeShop']").val());
        const hashedPasswordExchangeShop = web3.utils.soliditySha3($("input[name='passwordExchangeShop']").val());
        console.log("hashedPasswordExchangeShop ", hashedPasswordExchangeShop);
        console.log("exchangeShopAddress ", $("input[name='exchangeShopAddress']").val());


        // We simulate the real call and see whether this is likely to work.
        // No point in wasting gas if we have a likely failure.
        const success = await instance.registerExchangeShop.call(
            $("input[name='exchangeShopAddress']").val(),
            hashedPasswordExchangeShop,
            { from: window.account, gas: gas });

        if (!success) {
            throw new Error("The transaction will fail anyway, not sending");
        }

        // Ok, we move onto the proper action.
        const txObj = await instance.registerExchangeShop(
            $("input[name='exchangeShopAddress']").val(),
            hashedPasswordExchangeShop,
            { from: window.account, gas: gas })
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
            $("#status").html("Exchange Shop Registered");
        }
        
        // Make sure we update the UI.
        $("#balanceContract").html(await web3.eth.getBalance(instance.address));

    } catch(err) {
        $("#status").html(err.toString());
        console.error(err);
    }
};



const initiateTransfer = async function() {
    // Sometimes you have to force the gas amount to a value you know is enough because
    // `web3.eth.estimateGas` may get it wrong.
    const gas = 300000;
    try {
        const accounts = await (/*window.ethereum ?
            window.enable() ||*/
            web3.eth.getAccounts());
            console.log("accounts ", accounts);
        const instance = await Remittance.deployed();
       
       const hashedPasswordExchangeShop = web3.utils.soliditySha3($("input[name='passwordRecipient']").val());

        // We simulate the real call and see whether this is likely to work.
        // No point in wasting gas if we have a likely failure.
        const success = await instance.initiateTransfer.call(
            $("input[name='recipeientAddress']").val(),
            hashedPasswordExchangeShop,
            { from: $("input[name='senderAddress']").val(), value: $("input[name='amount']").val(), gas: gas });

        if (!success) {
            throw new Error("The transaction will fail anyway, not sending");
        }
        // Ok, we move onto the proper action.
        const txObj = await instance.initiateTransfer(
            $("input[name='recipeientAddress']").val(),
            hashedPasswordExchangeShop,
            { from: $("input[name='senderAddress']").val(), value: $("input[name='amount']").val(), gas: gas })
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
        $("#balanceContract").html(await web3.eth.getBalance(instance.address));

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
            console.log("accounts ", accounts);
        if (accounts.length == 0) {
            throw new Error("No account with which to transact");
        }

        const instance = await Remittance.deployed();
        const hashedNewPasswordExchangeShop = web3.utils.soliditySha3($("input[name='newPasswordExchangeWithdraw']").val());

        // We simulate the real call and see whether this is likely to work.
        // No point in wasting gas if we have a likely failure.
        const success = await instance.withdrawFunds.call(
            $("input[name='passwordRecipientWithdraw']").val(),
            $("input[name='passwordExchangeWithdraw']").val(),
            hashedNewPasswordExchangeShop,
            $("input[name='transactionID']").val(),
            { from: $("input[name='exchangeShopAddress']").val(), gas: gas });
        if (!success) {
            throw new Error("The transaction will fail anyway, not sending");
        }

        // Ok, we move onto the proper action.
        const txObj = await instance.withdrawFunds(
            $("input[name='passwordRecipientWithdraw']").val(),
            $("input[name='passwordExchangeWithdraw']").val(),
            hashedNewPasswordExchangeShop,
            $("input[name='transactionID']").val(),
            { from: $("input[name='exchangeShopAddress']").val(), gas: gas })
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
        $("#balanceContract").html(await web3.eth.getBalance(instance.address));

         const balanceExchangeShop = await web3.eth.getBalance($("input[name='exchangeShopAddress']").val());
         $("#balanceExchangeShop").html(balanceExchangeShop);
        
    } catch(err) {
        $("#status").html(err.toString());
        console.error(err);
    }
    
};