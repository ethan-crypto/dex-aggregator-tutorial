import React, { Component } from 'react'
import Web3 from 'web3'
import IERC20 from '../abis/IERC20.json'
import DexAggregator from '../abis/DexAggregator.json'
import Navbar from './Navbar'
import Main from './Main'
import './App.css'
import { futureTime } from '../helpers'

const usdcAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
const exchangeDataReset = {        
  outputsLoading: false,
  uniOutput: '0',
  sushiOutput: '0',
}
class App extends Component {

  async componentWillMount() {
    await this.loadWeb3()
    await this.loadBlockchainData()
  }

  async loadBlockchainData() {
    const web3 = window.web3

    const accounts = await web3.eth.getAccounts()
    this.setState({ account: accounts[0] })

    const ethBalance = await web3.eth.getBalance(this.state.account)
    this.setState({ ethBalance })

    // Load USDC
    try {
      // Create new web3 usdc contract instance
      const usdc = new web3.eth.Contract(IERC20.abi, usdcAddress)
      this.setState({ usdc })
      let usdcBalance = await usdc.methods.balanceOf(this.state.account).call()
      this.setState({ usdcBalance: usdcBalance.toString() })
    } catch (error) {
      console.log('USDC contract not deployed to the current network. Please select another network with Metamask.')
    }

    // Load Aggregator
    const networkId =  await web3.eth.net.getId()
    const dexAggregatorData = DexAggregator.networks[networkId]
    if(dexAggregatorData) {
      const dexAggregator = new web3.eth.Contract(DexAggregator.abi, dexAggregatorData.address)
      this.setState({ dexAggregator })
      this.setState({ dexAddress: dexAggregatorData.address})
    } else {
      window.alert('DexAggregator contract not deployed to detected network.')
    }

    this.setState({ loading: false })
  }

  async loadWeb3() {
    if (window.ethereum) {
      window.web3 = new Web3(window.ethereum)
      await window.ethereum.enable()
    }
    else if (window.web3) {
      window.web3 = new Web3(window.web3.currentProvider)
    }
    else {
      window.alert('Non-Ethereum browser detected. You should consider trying MetaMask!')
    }
  }

  buyUsdc = (etherAmount) => {
    this.setState({ loading: true })
    this.state.dexAggregator.methods.buyUSDCAtBestPrice(futureTime(15)).send({ value: etherAmount, from: this.state.account }).on('transactionHash', (hash) => {
      this.setState({ loading: false })
      this.setState({exchangeData : exchangeDataReset})
    })
  }

  sellUsdc = async (usdcAmount) => {
    this.setState({ loading: true })
    console.log(this.state.dexAggregator)
    await this.state.usdc.methods.approve(this.state.dexAddress, usdcAmount).send({ from: this.state.account })
    await this.state.dexAggregator.methods.sellUSDCAtBestPrice(usdcAmount, futureTime(15)).send({ from: this.state.account })
    this.setState({ loading: false })
    this.setState({exchangeData : exchangeDataReset})
  }

  getOutputs = async (input, pairArray) => {
    let data = this.state.exchangeData
    if(input !== '0' ){
      this.setState({ exchangeData: {...data, outputsLoading: true }})
      const outputs = await this.state.dexAggregator.methods.getReturnAmounts(input, pairArray).call()
      console.log(outputs)
      this.setState({ 
        exchangeData: {
          ...data,
          outputsLoading: false,
          uniOutput: outputs[0],
          sushiOutput: outputs[1]
        }
      })
    } else {
      this.setState({
        exchangeData: exchangeDataReset
      })
    }
  }

  constructor(props) {
    super(props)
    this.state = {
      account: '',
      usdc: {},
      dexAggregator: {},
      ethBalance: '0',
      usdcBalance: '0',
      loading: true,
      dexAddress: "",
      exchangeData: exchangeDataReset
    }
  }

  render() {
    let content
    if(this.state.loading) {
      content = <p id="loader" className="text-center">Loading...</p>
    } else {
      content = <Main
        ethBalance={this.state.ethBalance}
        usdcBalance={this.state.usdcBalance}
        exchangeData={this.state.exchangeData}
        buyUsdc={this.buyUsdc}
        sellUsdc={this.sellUsdc}
        getOutputs={this.getOutputs}
      />
    }

    return (
      <div>
        <Navbar account={this.state.account} />
        <div className="container-fluid mt-5">
          <div className="row">
            <main role="main" className="col-lg-12 ml-auto mr-auto" style={{ maxWidth: '600px' }}>
              <div className="content mr-auto ml-auto">
                <a
                  href="http://www.dappuniversity.com/bootcamp"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                </a>

                {content}

              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }
}

export default App;

