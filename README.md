# remittance
B9Lab Remittance Project

The Remittance DApp provides a way for Alice to send funds to Bob via Carol's exchange shop.
Alice initiates the transfer by sending Ether to the contract. Carol exchanges the Ether for a local currency and gives the local currency to Bob.
Alice gives Bob and Carol each a password that must be revealed in order to do the exchange. Alice initiates the transfer.
Ether is put in Carol's escrow account. Bob and Carol both provide their passwords so that Carol can withdraw the Ether in the escrow account. The Ether in escrow is
released to Carol. Presumably, Carol gives Bob cash in local currency, but that happens outside the scope of the Dapp.
The passwords are generated using a link to a random.org page. This simulates Alice generating and
sending passwords to Bob and Carol.  They are hashed offchain and then stored in hashed format in the contract.
This solution is very insecure (everyone can see the passwords), but I can't think of any other way to do
it and still meet the project requirements.

## Functional Requirements
1.	there are three people: Alice, Bob & Carol.
2.	Alice wants to send funds to Bob, but she only has ether & Bob does not care about Ethereum and wants to be paid in local currency.
3.	luckily, Carol runs an exchange shop that converts ether to local currency.
4.	Therefore, to get the funds to Bob, Alice will allow the funds to be transferred through Carol's exchange shop. Carol will collect the ether from Alice and give the local currency to Bob.

## Notes
* This is the basic implementation. I will implement the "stretch" goals after the basics are satisfactory
*
