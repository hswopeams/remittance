# remittance
B9Lab Remittance Project

1. Any sender can send money to any recipient. 
2. Sender generates password and sends to recipient (out of process). Recipient password is checked to make sure it hasn't been used before. Sender also specifies an expiration as number of days in the future.
3. Recipient can go to any registered exchange shop to get his/her funds as long as the transaction hasn't expired.
4. Exchange shop must be registered (Western Union only allows franchisees to operate). Exchange shop proprietor asks
recipient to provide his/her password in order to withdraw funds. Exchange shop proprietor gives recipient cash (out of  process)
5. Sender can cancel transfer if it has expired.
6. Contract owner can register and deregister exchange shops.
7. Contract now has generateHash function that includes a salt in the hash.
8. Killable functionality now requires that contract be paused before it can be killed.




