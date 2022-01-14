const IERC20 = artifacts.require("IERC20");

const toUSDC = (num) => web3.utils.toWei(num.toString(), "mwei")
const fromUSDC = (num) => web3.utils.fromWei(num.toString(), "mwei")

module.exports = async function (callback) {
	try {
		const usdcAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
		const unlockedAccount = "0xc647F8f745a59B74A26d76Da7dcCc8BadF649C32"
		// Accounts given to us by ganache
		const accounts = await web3.eth.getAccounts()
		const usdc = new web3.eth.Contract(IERC20.abi, usdcAddress)
		// Fetch unlocked account and first development account usdc balances
		const balanceUnlocked = await usdc.methods.balanceOf(unlockedAccount).call()
		const balanceDev = await usdc.methods.balanceOf(accounts[0]).call()
		console.log(`Unlocked account usdc balance before transfer ${fromUSDC(balanceUnlocked)}`)
		console.log(`First dev account usdc balance before transfer ${fromUSDC(balanceDev)}`)
		// Transfer unlocked accounts usdc balance to the first development account
		await usdc.methods.transfer(accounts[0], balanceUnlocked).send({from: unlockedAccount})
		// Fetch new development usdc balance 
		const newBalanceDev = await usdc.methods.balanceOf(accounts[0]).call()
		const newBalanceUnlocked = await usdc.methods.balanceOf(unlockedAccount).call()
		console.log(`Unlocked account usdc balance after transfer ${fromUSDC(newBalanceUnlocked)}`)
		console.log(`First dev account usdc balance after transfer ${fromUSDC(newBalanceDev)}`)
	}
	catch (error) {
		console.log(error)
	}
	callback()
}