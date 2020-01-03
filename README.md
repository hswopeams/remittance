# remittance
B9Lab Remittance Project

Contract which provides a way for Person A to send funds to Person B via any registered exchange shop.
 * The owner of the contract must first register the exchange shop as a participating exchange shop and also assign the exchange shop's password.
 * Person A sends Ether, the exchange shop proprietor exchanges the Ether for a local currency and gives the currency to Person B.
 * Person A initiats the transfer, indicating for whom the funds are intended and assignes the password the recipeient will have to use in order to receive the funds.
 * Person B goes to a registered exchange shop. The exchange shop proprietor withdraws funds, providing her own password, the recipeint's password, and the transaction ID.
 * for verification purposes. The exchange shop proprietor gives Person B cash in local currency, but that happens outside the scope of the Dapp.
 * Any party can remit funds to any other party using any registered eschange shop in this way.
 * Passwords are hashed offline and only stored by the contract.
 * If the contract is "killed", the transactions can be retrieved to keep track of which transactions have not yet been carried out

## Original Functional Requirements
1. Any sender can send money to any recipient. 
2. Sender generates password and sends gives to recipient (out of process)
3. Recipient can go to any registered exchange shop to get his/her funds
4. Exchange shop must be registered (Western Union only allows franchisees to operate) and have a password assigned by contract owner.
5. Pausable and Killable functionality included


