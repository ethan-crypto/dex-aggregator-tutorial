import React, { Component } from 'react'
import { OverlayTrigger, Tooltip } from 'react-bootstrap'
import usdcLogo from '../usd-coin-usdc-logo.png'
import ethLogo from '../eth-logo.png'
import uniLogo from '../Uniswap_Logo.svg.png'
import sushiLogo from '../sushiswap-sushi-logo.png'
const usdcAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"

const renderExchangeRate = (exchangeRate, primary) => {
  return(
    <div className="mb-5">
      <span className={`float-left ${!primary ? `text-muted` : ``}`}>Exchange Rate</span>
      <span className={`float-right ${!primary ? `text-muted` : ``}`}>{Math.round(10**6*exchangeRate)/(10**6)} USDC = 1 ETH </span>
    </div>
  )
}

const renderExchangeLogo = (exchange, primary) => {
  const logo = exchange === 'Uniswap' ? uniLogo : sushiLogo
  const dex = exchange === 'Uniswap' ? 'UNI' : 'SUSHI'
  return(
    <div className="input-group-append">
      <div className={`input-group-text ${primary ? `border-primary` : `text-muted`}`}>
        <img src={logo} height='32' alt="" />
        &nbsp;&nbsp; {dex}
      </div>
    </div>
  )
}

 const renderOutputForms = (output, secondaryOutput, input, outputLoading, exchanges) => {
  let percentReturn = Math.round((((output/secondaryOutput) -1)*100)*10000)/10000
  console.log(output)
  console.log(secondaryOutput)
  let primaryExchangeRate = window.web3.utils.fromWei(input, "mwei")/ window.web3.utils.fromWei(output, "Ether")
  let secondaryExchangeRate = window.web3.utils.fromWei(input, "mwei")/ window.web3.utils.fromWei(secondaryOutput, "Ether")
  return (
    <>

      <div className="input-group mb-2" disabled>
        <input
          type="text"
          className="form-control form-control-lg border-primary"
          placeholder="0"
          value={
            outputLoading
              ? "Loading..."
              : window.web3.utils.fromWei(output.toString(), 'Ether')
          }
          disabled
        />
        {output !== "0" && !outputLoading ? renderExchangeLogo(exchanges[0], true): ''}
      </div>
        {output !== "0" && !outputLoading ? renderExchangeRate(primaryExchangeRate, true) : ''}
      <div className="input-group mb-2">
        <input
          type="text"
          className="form-control form-control-lg text-muted"
          placeholder="0"
          value={
            outputLoading
              ? "Loading..."
              : window.web3.utils.fromWei(secondaryOutput.toString(), 'Ether')
          }
          disabled
        />
        {output !== "0" && !outputLoading ? renderExchangeLogo(exchanges[1], false): ''}
      </div>
        {output !== "0"  && !outputLoading? renderExchangeRate(secondaryExchangeRate, false) : ''}
      <OverlayTrigger show={output !== '0' && !outputLoading}
        placement='bottom'
        overlay={
          <Tooltip >
            {`${percentReturn}% greater return offered by ${exchanges[0]}`}
          </Tooltip>}>
        <button type="submit" className="btn btn-primary btn-block btn-lg">SWAP!</button>
      </OverlayTrigger>
    </>
  )
}


class SellForm extends Component {


  constructor(props) {
    super(props)
      this.state = {
        usdcAmount: '0'
      }
  }

  render() {
    const {
      outputsLoading,
      dexIndexWithBestPrice,
      uniOutput,
      sushiOutput
    } = this.props.exchangeData
    console.log(this.props)
    let usdcAmount
    return (
      <form className="mb-3" onSubmit={(event) => {
        event.preventDefault()
        usdcAmount = this.input.value.toString()
        usdcAmount = window.web3.utils.toWei(usdcAmount, 'mwei')
        this.props.sellUsdc(usdcAmount)
      }}>
        <div>
          <label className="float-left">
            <img src={usdcLogo} height='32' alt="" />
            &nbsp; USDC
          </label>
          <span className="float-right text-muted">
            Balance: {window.web3.utils.fromWei(this.props.usdcBalance, 'mwei')}
          </span>
        </div>
        <div className="input-group mb-4">
          <input
            type="number"
            onChange={(event) => {
              usdcAmount = this.input.value.toString()
              if (usdcAmount) {
                usdcAmount = window.web3.utils.toWei(usdcAmount, 'mwei')
                this.props.getOutputs(usdcAmount, [usdcAddress, wethAddress])
                this.setState({usdcAmount})
              } else {
                this.props.getOutputs('0', [usdcAddress, wethAddress])
                this.setState({usdcAmount: '0'})
              }
            }}
            ref={(input) => { this.input = input }}
            className="form-control form-control-lg"
            placeholder="0"
            required />
        </div>
        <div className="d-flex justify-content-center">
          <i className="arrow down"></i>
        </div>
        <div>
          <label className="float-left">
            <img src={ethLogo} height='32' alt="" />
            &nbsp; ETH
          </label>
          <span className="float-right text-muted">
            Balance: {Math.round(10**6*window.web3.utils.fromWei(this.props.ethBalance, 'Ether'))/10**6}
          </span>
        </div>
        <div>
          { dexIndexWithBestPrice === "0"
            ? renderOutputForms(uniOutput, sushiOutput, this.state.usdcAmount, outputsLoading, ['Uniswap', 'SushiSwap'])
            : renderOutputForms(sushiOutput, uniOutput, this.state.usdcAmount, outputsLoading, ['SushiSwap', 'Uniswap'])
          }
        </div>

      </form>
    );
  }
}

export default SellForm;

