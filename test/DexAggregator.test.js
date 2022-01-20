const DexAggregator = artifacts.require("DexAggregator")
const IERC20 = artifacts.require("IERC20")


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
	let dexAggregator, usdcRef
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
            result = await dexAggregator.Dexes(0)
            result.toString().should.equal(uniAddress.toString())
        })
        it('tracks the correct sushiswap router address', async () => {
            result = await dexAggregator.Dexes(1)
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
    describe("getOutputAmounts", () => {
		let result
		let usdcAmount = toUSDC(1000)
        let ethAmount = toWei(1)
        let uniUSDCAmount, sushiUSDCAmount, uniETHAmount, sushiETHAmount
		it("gets index of exchange with best USDC price and output amounts from both exchanges for ETH to USDC swap", async () => {
			result = await dexAggregator.getOutputAmounts(ethAmount, [wethAddress, usdcAddress])
            const indexOfDexWithBestPrice = result[0]
            const amounts = result[1]
            expect(+(amounts[0].toString())).to.be.greaterThan(+(amounts[1].toString()))
            if(indexOfDexWithBestPrice == 0) {
                expect(indexOfDexWithBestPrice.toString()).to.equal('0')
                console.log(`Uniswap offers the best ETH to USDC rate`)
                uniUSDCAmount = amounts[0]
                sushiUSDCAmount = amounts[1]
            } else {
                expect(indexOfDexWithBestPrice.toString()).to.equal('1')
                console.log(`Sushiswap offers the best ETH to USDC rate`)
                uniUSDCAmount = amounts[1]
                sushiUSDCAmount = amounts[0]
            }
			uniUSDCAmount.toString().length.should.be.at.least(1, 'did not fetch USDC output value for Uniswap')
            console.log(`Uniswap converts 1 ETH to ${fromUSDC(uniUSDCAmount)} USDC`)
			sushiUSDCAmount.toString().length.should.be.at.least(1, 'did not fetch USDC output value for Sushiswap')
			console.log(`Sushiswap converts 1 ETH to ${fromUSDC(sushiUSDCAmount)} USDC`)
		})
		it("gets index of exchange with best ETH price and output amounts from both exchanges for USDC to ETH swap", async () => {
			result = await dexAggregator.getOutputAmounts(usdcAmount, [usdcAddress, wethAddress])
            const indexOfDexWithBestPrice = result[0]
            const amounts = result[1]
            expect(+(amounts[0].toString())).to.be.greaterThan(+(amounts[1].toString()))
            if(indexOfDexWithBestPrice == 0) {
                expect(indexOfDexWithBestPrice.toString()).to.equal('0')
                console.log(`Uniswap offers the best USDC to ETH rate`)
                uniETHAmount = amounts[0]
                sushiETHAmount = amounts[1]
            } else {
                expect(indexOfDexWithBestPrice.toString()).to.equal('1')
                console.log(`Sushiswap offers the best USDC to ETH rate`)
                uniETHAmount = amounts[1]
                sushiETHAmount = amounts[0]
            }
			uniETHAmount.toString().length.should.be.at.least(1, 'did not fetch ETH output value for Uniswap')
            console.log(`Uniswap converts 1000 USDC to ${fromWei(uniETHAmount)} ETH`)
			sushiETHAmount.toString().length.should.be.at.least(1, 'did not fetch ETH output value for Sushiswap')
			console.log(`Sushiswap converts 1000 USDC to ${fromWei(sushiETHAmount)} ETH`)
		})
	})
    describe('buyUSDCAtBestPrice', () => {
        let ethBalance
        let usdcBalance
        let result
        let highestUSDCOutput 
        let nextBestUsdcOutput
        let ethAmountSold = toWei(1)
        beforeEach(async () => {
            // start Ether and Usdc balance before swap
            ethBalance = await web3.eth.getBalance(user) //BN

            usdcBalance = await usdcRef.methods.balanceOf(user).call()

            // get USDC amount for 1 ETH from each exchange
            result = await dexAggregator.getOutputAmounts(ethAmountSold, [wethAddress, usdcAddress])

            // Create an object with the exchange with the highest output and highest output value
            result[0].toString() == "0"
            ? highestUSDCOutput = {amount: result[1][0], dex: uniAddress}
            : highestUSDCOutput = {amount: result[1][0], dex: sushiAddress}
            
            nextBestUsdcOutput = result[1][1]
            //swap 1 ETH for USDC
            result = await dexAggregator.buyUSDCAtBestPrice(futureTime(15), [wethAddress, usdcAddress], {value: ethAmountSold, from: user })
        }) 
        it('Routes ETH to USDC swap to the exchange with highest output', async () => {
            console.log(`START ETH BALANCE: ${fromWei(ethBalance)}`)
            console.log(`START USDC BALANCE: ${fromUSDC(usdcBalance)}`)
            // Users new USDC balance should increase by the highestUSDCOutput
            const newUsdcBalance = await usdcRef.methods.balanceOf(user).call()
            console.log(`NEW USDC BALANCE: ${fromUSDC(newUsdcBalance)}`)
            const usdcAdded = +usdcBalance.toString() + +highestUSDCOutput.amount.toString()
            expect(+(newUsdcBalance.toString())).to.equal(usdcAdded)
            // Users new ETH balance should decrease by approximatly ethAmountSold
            // small discrecpency due to fees
            const newEthBalance = await web3.eth.getBalance(user)
            console.log(`NEW ETH BALANCE: ${fromWei(newEthBalance)}`)
            const ethSubtracted = +ethBalance.toString() - +ethAmountSold.toString()
            expect(+(newEthBalance.toString())).to.be.lessThan(ethSubtracted)
            console.log(`${fromWei(newEthBalance).toString()} is approx ${fromWei(ethSubtracted).toString()}`)
            // fail case: reverts when the user inputs the wrong traiding pair array
            await dexAggregator.buyUSDCAtBestPrice(futureTime(15), [usdcAddress, wethAddress], {value: 1, from: user }).should.be.rejected;
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
            // Amount of USDC bought should equal the highest ouput offered
            event.usdcAmountBought.toString().should.equal(highestUSDCOutput.amount.toString())
            // Router should equal the router exchange address that offered highest Ooutput
            event.dex.toString().should.equal(highestUSDCOutput.dex.toString())
            event.nextBestUsdcOutput.toString().should.equal(nextBestUsdcOutput.toString())
          }) 
    })

    describe('sellUSDCAtBestPrice', () => {
        let ethBalance
        let usdcBalance
        let result
        let highestEthOutput 
        let nextBestEthOutput
        let usdcAmountSold = toUSDC(1000)
        beforeEach(async () => {
            // start Ether and Usdc balance before swap
            ethBalance = await web3.eth.getBalance(user) //BN

            usdcBalance = await usdcRef.methods.balanceOf(user).call()

            //get ETH amount for 1000 USDC from each exchange
            result = await dexAggregator.getOutputAmounts(usdcAmountSold, [usdcAddress, wethAddress])
            nextBestEthOutput = result[1][1]

            // Create an object with the exchange with the highest output and highest output value
            result[0].toString() == "0"
            ? highestEthOutput = {amount: result[1][0], dex: uniAddress}
            : highestEthOutput = {amount: result[1][0], dex: sushiAddress}

            // user must approve dexAggragtor to spend users usdc before selling it
            await usdcRef.methods.approve(dexAggregator.address, usdcAmountSold).send({from: user})
            
            //swap 1000 USDC for ETH 
            result = await dexAggregator.sellUSDCAtBestPrice(usdcAmountSold, futureTime(15), [usdcAddress, wethAddress], {from: user })

        }) 
        it('Routes USDC to ETH swap to the exchange with highest return', async () => {
            console.log(`START ETH BALANCE: ${fromWei(ethBalance)}`)
            console.log(`START USDC BALANCE: ${fromUSDC(usdcBalance)}`)
            // Users new USDC balance should decrease by the usdcAmountSold
            const newUsdcBalance = await usdcRef.methods.balanceOf(user).call()
            console.log(`NEW USDC BALANCE: ${fromUSDC(newUsdcBalance)}`)
            const usdcSubtracted = +usdcBalance.toString() - +usdcAmountSold.toString()
            expect(+(newUsdcBalance.toString())).to.equal(usdcSubtracted)
            // Users new ETH balance should increase by approximatly the highest ETH output
            // small discrecpency due to fees
            const newEthBalance = await web3.eth.getBalance(user)
            console.log(`NEW ETH BALANCE: ${fromWei(newEthBalance)}`)
            const ethAdded = +ethBalance.toString() + +highestEthOutput.amount.toString()
            expect(+(newEthBalance.toString())).to.be.lessThan(ethAdded)
            console.log(`${fromWei(newEthBalance).toString()} is approx ${fromWei(ethAdded).toString()}`)
            // fail case: users can't sell more usdc than they have
            await dexAggregator.sellUSDCAtBestPrice((newUsdcBalance + 1), futureTime(15), { from: user }).should.be.rejected;
            // fail case: reverts when the user inputs the wrong traiding pair array
            await usdcRef.methods.approve(dexAggregator.address, 1).send({from: user})
            await dexAggregator.buyUSDCAtBestPrice(1 ,futureTime(15), [wethAddress, usdcAddress], { from: user }).should.be.rejected;
        }) 
        it('emits a "USDCSold" event', () => {
            const log = result.logs[0]
            log.event.should.eq('USDCSold')
            const event = log.args
            event.usdcAmountSold.toString().should.equal(usdcAmountSold.toString())
            // Amount of ETH bought should equal the highest output offered
            event.ethAmountBought.toString().should.equal(highestEthOutput.amount.toString())
            // Router should equal the router exchange address that offered highest return
            event.dex.toString().should.equal(highestEthOutput.dex.toString())
            event.nextBestEthOutput.toString().should.equal(nextBestEthOutput.toString())
        }) 
    })
        
})