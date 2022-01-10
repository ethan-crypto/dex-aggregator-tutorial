import React, { Component } from 'react'
import BuyForm from './BuyForm'
import SellForm from './SellForm'

class Main extends Component {
  constructor(props) {
    super(props)
    this.state = {
      currentForm: 'buy'
    }
  }

  render() {
    let content
    if(this.state.currentForm === 'buy') {
      content = <BuyForm
        ethBalance={this.props.ethBalance}
        usdcBalance={this.props.usdcBalance}
        exchangeData={this.props.exchangeData}
        buyUsdc={this.props.buyUsdc}
        getOutputs={this.props.getOutputs}
      />
    } else {
      content = <SellForm
        ethBalance={this.props.ethBalance}
        usdcBalance={this.props.usdcBalance}
        exchangeData={this.props.exchangeData}
        sellUsdc={this.props.sellUsdc}
        getOutputs={this.props.getOutputs}
      />
    }

    return (
      <div id="content" className="mt-3">

        <div className="d-flex justify-content-between mb-3">
          <button
              className="btn btn-light"
              onClick={(event) => {
                this.setState({ currentForm: 'buy' })
                this.props.getOutputs("0")
              }}
            >
            Buy
          </button>
          <span className="text-muted">&lt; &nbsp; &gt;</span>
          <button
              className="btn btn-light"
              onClick={(event) => {
                this.setState({ currentForm: 'sell' })
                this.props.getOutputs("0")
              }}
            >
            Sell
          </button>
        </div>

        <div className="card mb-4" >

          <div className="card-body">

            {content}

          </div>

        </div>

      </div>
    );
  }
}

export default Main;
