const DexAggregator = artifacts.require("DexAggregator")
const IERC20 = artifacts.require("IERC20")
const IUniswapRouter02 = artifacts.require('IUniswapV2Router02')


const futureTime = (seconds) => {
    return (+Math.floor(new Date().getTime()/1000.0) + +seconds)
} 
const toWei = (num) => web3.utils.toWei(num.toString(), "Ether")
const fromWei = (num) => web3.utils.fromWei(num.toString())
const toUSDC = (num) => web3.utils.toWei(num.toString(), "mwei")
const fromUSDC = (num) => web3.utils.fromWei(num.toString(), "mwei")


require('chai')
	.use(require('chai-as-promised'))
	.should()


contract('DexAggregator', ([deployer, user]) => {
	const uniAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
	const sushiAddress = "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F"
    const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    const usdcAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
	let dexAggregator, usdcRef, uniRouterRef, sushiRouterRef
    let pairArray 
    let SETTINGS = {
        gasLimit: 6000000, // Override gas settings: https://github.com/ethers-io/ethers.js/issues/469
        gasPrice: web3.utils.toWei('50', 'Gwei'),
        from: deployer, 
        value: toWei(1) // Amount of Ether to Swap
    }

	beforeEach(async () => {
		dexAggregator = await DexAggregator.new(sushiAddress, usdcAddress)
        usdcRef = new web3.eth.Contract(IERC20.abi, usdcAddress)
	})

    describe('deployment', () => {
        let result
        it('tracks the correct uniswap router address', async () => {
            result = await dexAggregator.uniAddress()
            result.toString().should.equal(uniAddress.toString())
        })
        it('tracks the correct sushiswap router address', async () => {
            result = await dexAggregator.sushiAddress()
            result.toString().should.equal(sushiAddress.toString())
        })
        it('tracks the correct usdc address', async () => {
            result = await dexAggregator.usdc()
            result.toString().should.equal(usdcAddress.toString())
        }) 
        it('tracks the correct weth address', async () => {
            result = await dexAggregator.wethAddress()
            result.toString().should.equal(wethAddress.toString())
        })
    })
    describe("getReturnAmounts", () => {
		let result
		let usdcAmount = toUSDC(1000)
        let ethAmount = toWei(1)
		it("gets USDC return amounts for ETH to USDC swap from both exchanges", async () => {
			result = await dexAggregator.getReturnAmounts(ethAmount, [wethAddress, usdcAddress])
            uniUSDCAmount = result[0]
            sushiUSDCAmount = result[1]
			result[0].toString().length.should.be.at.least(1, 'did not fetch USDC return value for Uniswap')
            console.log(`Uniswap converts 1 ETH to ${fromUSDC(uniUSDCAmount)} USDC`)
			result[1].toString().length.should.be.at.least(1, 'did not fetch USDC return value for Sushiswap')
			console.log(`Sushiswap converts 1 ETH to ${fromUSDC(sushiUSDCAmount)} USDC`)
		})
		it("gets ETH return amounts for USDC to ETH swap from both exchanges", async () => {
			result = await dexAggregator.getReturnAmounts(usdcAmount, [usdcAddress, wethAddress])
            uniETHAmount = result[0]
            sushiETHAmount = result[1]
			result[0].toString().length.should.be.at.least(1, 'did not fetch ETH return value for Uniswap')
            console.log(`Uniswap converts 1000 USDC to ${fromWei(uniETHAmount)} ETH`)
			result[1].toString().length.should.be.at.least(1, 'did not fetch USDC return value for Sushiswap')
			console.log(`Sushiswap converts 1000 USDC to ${fromWei(sushiETHAmount)} ETH`)
		})
	})
    describe('buyUSDCAtBestPrice', () => {
        let ethBalance
        let usdcBalance
        let result
        let uniUSDCReturn
        let sushiUSDCReturn
        let highestUSDCReturn 
        let ethAmountSold = toWei(1)
        beforeEach(async () => {
            // start Ether and Usdc balance before swap
            ethBalance = await web3.eth.getBalance(user) //BN

            usdcBalance = await usdcRef.methods.balanceOf(user).call()

            //get USDC amount for 1 ETH from each exchange
            returnAmounts = await dexAggregator.getReturnAmounts(ethAmountSold, [wethAddress, usdcAddress])
            uniUSDCReturn = returnAmounts[0]
            sushiUSDCReturn = returnAmounts[1]
            
            //swap 1 ETH for USDC
            result = await dexAggregator.buyUSDCAtBestPrice(futureTime(15), {value: ethAmountSold, from: user })

            // Compare return values and find the highest return
            uniUSDCReturn > sushiUSDCReturn 
            ? highestUSDCReturn = {amount: uniUSDCReturn, router: uniAddress}
            : highestUSDCReturn = {amount: sushiUSDCReturn, router: sushiAddress}
        }) 
        it('successfully routes ETH to USDC swap to the exchange with highest return', async () => {
            console.log(`START ETH BALANCE: ${fromWei(ethBalance)}`)
            console.log(`START USDC BALANCE: ${fromUSDC(usdcBalance)}`)
            // Users new USDC balance should increase by the highestUSDCReturn
            const newUsdcBalance = await usdcRef.methods.balanceOf(user).call()
            console.log(`NEW USDC BALANCE: ${fromUSDC(newUsdcBalance)}`)
            const usdcAdded = +usdcBalance.toString() + +highestUSDCReturn.amount.toString()
            expect(+(newUsdcBalance.toString())).to.equal(usdcAdded)
            // Users new ETH balance should decrease by approximatly ethAmountSold
            // small discrecpency due to fees
            const newEthBalance = await web3.eth.getBalance(user)
            console.log(`NEW ETH BALANCE: ${fromUSDC(newEthBalance)}`)
            const ethSubtracted = +ethBalance.toString() - +ethAmountSold.toString()
            expect(+(newEthBalance.toString())).to.be.lessThan(ethSubtracted)
            console.log(`${fromWei(newEthBalance).toString()} is approx ${fromWei(ethSubtracted).toString()}`)
        }) 
        it('successfully refunds leftover ETH from the swap', async () => {
            // Aggregator Eth balance should be zero
            const dexAggregatorEthBalance = await usdcRef.methods.balanceOf(dexAggregator.address).call()
            expect((dexAggregatorEthBalance).toString()).to.equal('0')
        })
        it('emits a "USDCBought" event', () => {
            const log = result.logs[0]
            log.event.should.eq('USDCBought')
            const event = log.args
            event.ethAmountSold.toString().should.equal(ethAmountSold.toString())
            // Amount of USDC bought should equal the highest return offered
            event.usdcAmountBought.toString().should.equal(highestUSDCReturn.amount.toString())
            // Router should equal the router exchange address that offered highest return
            event.router.toString().should.equal(highestUSDCReturn.router.toString())
            // Find next best USDC return
            nextBestUsdcReturn = highestUSDCReturn.amount == uniUSDCReturn ? sushiUSDCReturn : uniUSDCReturn
            event.nextBestUsdcReturn.toString().should.equal(nextBestUsdcReturn.toString())
          }) 
    })

    describe('sellUSDCAtBestPrice', () => {
        let ethBalance
        let usdcBalance
        let result
        let uniETHReturn
        let sushiETHReturn
        let highestETHReturn 
        let usdcAmountSold = toUSDC(1000)
        beforeEach(async () => {
            // start Ether and Usdc balance before swap
            ethBalance = await web3.eth.getBalance(user) //BN

            usdcBalance = await usdcRef.methods.balanceOf(user).call()
            console.log(`START USDC BALANCE: ${fromUSDC(usdcBalance)}`)
            //get USDC amount for 1 ETH from each exchange
            returnAmounts = await dexAggregator.getReturnAmounts(usdcAmountSold, [usdcAddress, wethAddress])
            uniETHReturn = returnAmounts[0]
            sushiETHReturn = returnAmounts[1]

            // user must approve dexAggragtor to spend users usdc before selling it
            await usdcRef.methods.approve(dexAggregator.address, usdcAmountSold).send({from: user})
            
            //swap 1000 USDC for ETH 
            result = await dexAggregator.sellUSDCAtBestPrice(usdcAmountSold, futureTime(15), {from: user })

            // Compare return values and find the highest return
            uniETHReturn > sushiETHReturn 
            ? highestETHReturn = {amount: uniETHReturn, router: uniAddress}
            : highestETHReturn = {amount: sushiETHReturn, router: sushiAddress}
        }) 
        it('successfully routes USDC to ETH swap to the exchange with highest return', async () => {
            console.log(`START ETH BALANCE: ${fromWei(ethBalance)}`)
            console.log(`START USDC BALANCE: ${fromUSDC(usdcBalance)}`)
            // Users new USDC balance should decrease by the usdcAmountSold
            const newUsdcBalance = await usdcRef.methods.balanceOf(user).call()
            console.log(`NEW USDC BALANCE: ${fromUSDC(newUsdcBalance)}`)
            const usdcSubtracted = +usdcBalance.toString() - +usdcAmountSold.toString()
            expect(+(newUsdcBalance.toString())).to.equal(usdcSubtracted)
            // Users new ETH balance should increase by approximatly the highest ETH return
            // small discrecpency due to fees
            const newEthBalance = await web3.eth.getBalance(user)
            console.log(`NEW ETH BALANCE: ${fromUSDC(newEthBalance)}`)
            const ethAdded = +ethBalance.toString() + +highestETHReturn.amount.toString()
            expect(+(newEthBalance.toString())).to.be.lessThan(ethAdded)
            console.log(`${fromWei(newEthBalance).toString()} is approx ${fromWei(ethAdded).toString()}`)
        }) 
        it('emits a "USDCSold" event', () => {
            const log = result.logs[0]
            log.event.should.eq('USDCSold')
            const event = log.args
            event.usdcAmountSold.toString().should.equal(usdcAmountSold.toString())
            // Amount of ETH bought should equal the highest return offered
            event.ethAmountBought.toString().should.equal(highestETHReturn.amount.toString())
            // Router should equal the router exchange address that offered highest return
            event.router.toString().should.equal(highestETHReturn.router.toString())
            // Find next best USDC return
            nextBestEthReturn = highestETHReturn.amount == uniETHReturn ? sushiETHReturn : uniETHReturn
            event.nextBestEthReturn.toString().should.equal(nextBestEthReturn.toString())
          }) 
    })
        
})