const Remittance = artifacts.require("Remittance");

module.exports = function(deployer, network, accounts) {
  deployer.deploy(Remittance, accounts[3]);
  //deployer.deploy(Killable, accounts[9]);
};
