# remittance
B9Lab Remittance Project

Contract which provides a way for Person A to send funds to Person B via Carol's exchange shop.
Person A sends Ether, Carol exchanges the Ether for a local currency and gives the currency to Person B.
Person A initiats the transfer, indicating for whom the funds are intended.
Ether is put in Carol's escrow account. Person B goes to Carol's exchange shop. Carol withdraws funds, providing her own address and  the address of the receiver for verification purposes.
Carol gives Person B cash in local currency, but that happens outside the scope of the Dapp.
This gets rid of the insecure password issue, but begs the question why use the exchange shop at all and not just remit funds to the receivers address.
Any party can remit funds to any other party in this way.
If the contract is "killed", the transactions can be retrieved to keep track of which transactions not yet carried out

## Original Functional Requirements
1.	there are three people: Alice, Bob & Carol.
2.	Alice wants to send funds to Bob, but she only has ether & Bob does not care about Ethereum and wants to be paid in local currency.
3.	luckily, Carol runs an exchange shop that converts ether to local currency.
4.	Therefore, to get the funds to Bob, Alice will allow the funds to be transferred through Carol's exchange shop. Carol will collect the ether from Alice and give the local currency to Bob.

## Notes
* Added functionality to allow any party to be able to send money to any party via the exchange shop, as requested by Adel.
* Added killabl functionality, as requested by Adel.
* Made other changes based on comments.
