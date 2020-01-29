const Remittance = artifacts.require("Remittance");
const MockRemittance = artifacts.require("MockRemittance");

module.exports = function(deployer) {
  deployer.deploy(Remittance);
};
