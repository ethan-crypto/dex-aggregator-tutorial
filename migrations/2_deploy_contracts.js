const DexAggregator = artifacts.require("DexAggregator");
const sushiAddress = "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F"
const usdcAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
module.exports = function (deployer) {
  deployer.deploy(DexAggregator, sushiAddress, usdcAddress, wethAddress)
};