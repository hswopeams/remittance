const Remittance = artifacts.require("Remittance");

module.exports = function(deployer, network, accounts) {
  deployer.deploy(Remittance);
};
