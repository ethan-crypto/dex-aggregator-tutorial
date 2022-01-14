# Dex Aggregator
### About
A simple full stack application with smart contract that compares exchange rates for the weth/usdc traiding pair across Uniswap and Sushiswap and then routes users swap to the dex with the best price.

### User Interface
![](https://github.com/ethan-crypto/dex-aggregator-tutorial/Dex-Agg.gif)

## Technology Stack & Tools

- Solidity (Programming language for writing smart sontracts)
- Javascript (Used for testing and to build front end with React)
- [Uniswap V2 Protocol](https://docs.uniswap.org/protocol/V2/introduction)
- [Sushiswap Protocol](https://dev.sushi.com/)
- [Web3](https://web3js.readthedocs.io/en/v1.5.2/) (Blockchain interaction)
- [Truffle](https://www.trufflesuite.com/docs/truffle/overview) (Development Ffamework)
- [Ganache-cli](https://github.com/trufflesuite/ganachee) (For local blockchain fork of the ethereum mainnet)
- [Infura](https://infura.io/) (connection to Ethereum networks)
- [Open Zeppelin](https://infura.io/) (smart contract libraries)

## Requirements For Initial Setup
- Install [NodeJS](https://nodejs.org/en/), should work with any node version below 16.5.0
- Install [Truffle](https://www.trufflesuite.com/docs/truffle/overview), In your terminal, you can check to see if you have truffle by running `truffle version`. To install truffle run `npm i -g truffle`. Ideal to have truffle version 5.4 to avoid dependency issues.
- Install [Ganache-cli](https://github.com/trufflesuite/ganachee). Install ganache globally by running `npm install -g ganache-cli` in your terminal

## Setting Up
### 1. Clone/Download the Repository
```sh
$ git clone https://github.com/ethan-crypto/dex-aggregator-tutorial
```

### 2. Install Dependencies:
```
$ cd dex-aggregator-tutorial
$ npm install 
```

### 3. Get Infura URL
- Go to [Infura](https://infura.io/), sign up, create a new project, copy that projects url
e.g Mainnet URL https://mainnet.infura.io/v3/11111111111111111

### 3. Start Ganache-cli as a fork of the mainnet and unlock account with a lot of USDC.
```sh
$ ganache-cli -f https://mainnet.infura.io/v3/11111111111111111
-u 0xc647F8f745a59B74A26d76Da7dcCc8BadF649C32
```

### 4. Connect you ganache-cli addresses to Metamask
- Copy private key of the addresses in ganache and import to Metamask
- Connect your metamask to network Localhost 8545 

### 5. Run script that transfers USDC from unlcoked account to first development account
`$ truffle exec ./scripts/transferUSDC.js`

### 6. Migrate smart contracts
`$ truffle migrate --reset`

### 7. Run tests
`$ truffle test`

### 8. Run app locally 
`$ npm run start`

License
----
MIT
