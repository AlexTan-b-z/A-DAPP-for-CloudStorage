var TokenERC20 = artifacts.require("./TokenERC20.sol");
var SaveCloud = artifacts.require("./SaveCloud.sol");

module.exports = function(deployer) {
  deployer.deploy(SaveCloud).then(function() {
    return deployer.deploy(TokenERC20, 10000000, "cloudb", "CloudB", SaveCloud.address);
  })
  /* deployer.deploy(TokenERC20, 10000000, "cloudb", "CB").then(function () {
    return deployer.deploy(SaveCloud, TokenERC20.address);
  });  */
  //deployer.link(TokenERC20, SaveCloud);
  //deployer.deploy(SaveCloud);
};
