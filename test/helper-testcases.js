const chai = require('chai');
const BN = require('bn.js');
const bnChai = require('bn-chai');
chai.use(bnChai(BN));
const assert = chai.assert;
const expect = chai.expect;
const helper = require("./helpers/truffleTestHelper");

describe("Testing Helper Functions", () => {
    
    it("should advance the blockchain forward a block", async () =>{
        const originalBlock = await web3.eth.getBlock('latest');
        const newBlock = await web3.eth.getBlock('latest');

        const newBlockHash = await helper.advanceAndGetLatestBlock();

        assert.notEqual(originalBlock.hash, newBlockHash);
        assert.notEqual(newBlock.hash, newBlockHash);
    });

   
    it("should be able to advance time and block together", async () => {
        const advancement = 600;
        const originalBlock = await web3.eth.getBlock('latest');
        const newBlock = await helper.advanceTimeAndBlock(advancement);
        const timeDiff = newBlock.timestamp - originalBlock.timestamp;

        assert.isAtLeast(timeDiff, advancement, 'Expected ' + timeDiff + ' to be greater or equal to ' + advancement);

    });

});