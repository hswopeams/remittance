const Remittance = artifacts.require("Remittance");

module.exports = function(deployer) {
  deployer.deploy(Remittance);
};
