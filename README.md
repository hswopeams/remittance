# Remittance
B9lab Academy Project 2

This the second project I developed for the B9lab Academy Ethereum Developer Course. It represents an exchange scenario in which a sender (Alice) sends ETH to someone (Bob). Alice gives Bob a one-time password 
(this happens outside the scope of the dAPP). Bob goes to any exchange shop franchise (analogous to a Western Union franchise). Bob gives Carol (the exchange shop proprietor) the one-time password he got from Alice, as this is the key to the transfer. Bob provides his password. The exchange shop proprietor (Carol) withdraws the ETH to her own Ethereum account. She gives Bob the cash value of the ETH (this happens outside the scope of the dApp). If Bob doesn't claim his funds within the specified expiration time, the transfer is invalid, and the funds cannot be withdrawn. After expiration, the transfer can be cancelled by the sender. The funds are returned to the sender.

I'm not a front-end developer, so the GUI is very simple. It serves only to show that I can wire a front-end to a smart contract.

## Functional Requirements
1. Any sender can send money to any recipient. 
2. Sender generates password and sends to recipient (out of process). Recipient password is checked to make sure it hasn't been used before. Sender also specifies an expiration as number of days in the future.
3. Recipient can go to any registered exchange shop to get his/her funds as long as the transaction hasn't expired.
4. Exchange shop must be registered (Western Union only allows franchisees to operate). Exchange shop proprietor asks
5. recipient to provide his/her password in order to withdraw funds. Exchange shop proprietor gives recipient cash (out of  process).
6. Sender can cancel transfer if it has expired.
7. Contract owner can register and deregister exchange shops.
8. Ownership of the contract can be transferred. 
9. The contract can be paused and killed.


## How to run locally
1. Clone this respository
2. CD to the `remittance` directory
3. Run `npm install`
4. In a separate terminal,  run `ganache --host 0.0.0.0`. Assumes ganache-cli is installed globally (https://github.com/trufflesuite/ganache)
5. Take note of the addresses. 

1. In the first terminal, run `./node_modules/.bin/truffle migrate` to migrate contracts to ganache
2. Run `npm run build`
3. Run `npm run dev`
4. Go to <http://127.0.0.1:8000/> in your browser. 
5. Make sure  MetaMask is connected to the Localhost 8545 network.
6. Import 3 of the ganache addresses into Meta Mask to represent Alice (the sender), Carol (the exchange shop proprietor), and the contract owner.
7. The first page is the Remittance contract owner's page. Make sure the owner account imported into MetaMask is selected.
8. Fill in the address reserved for the exchange shop (Carol) and click `Register Exchange Shop`
9. The exchange shop can also be deregistered using the `Deregister Exchange Shop` button
10. Next go to the sender's page at <http://127.0.0.1:8000/transfer.html> . Make sure the Alice/sender account is selected in Metamask.
11. Fill in the amount of the transfer, the days in the future when the transfer will expire, and a password. A password can be obtained using the `Generate One-time Recipeient Password` link.
12. Next got o the exchange shop's page at <http://127.0.0.1:8000/exchangeshop.html>  . Make sure the Carol/exchange shop proprietor account is selected in Meta Mask.
13. To withdraw funds, fill in the one-time password that is the key transfer.


