// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

//Code for the shared router interface of sushiSwap and uniSwap.
interface IRouter {
    function WETH() external pure returns (address);
    function swapTokensForExactETH(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline)
        external
        returns (uint[] memory amounts);
    function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline)
        external
        payable
        returns (uint[] memory amounts);
    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
}
contract DexAggregator {
    address public immutable uniAddress;
    address public immutable sushiAddress;
    IERC20 public immutable usdc;
    address public immutable wethAddress;

    /// @notice USDCBought event emitted on successful ETH to USDC swap. 
    event USDCBought(
        uint256 usdcAmountBought, 
        uint256 ethAmountSold,
        address router, 
        uint256 nextBestUsdcReturn
    );
    /// @notice USDCSold event emitted on successful USDC to ETH swap.    
    event USDCSold(
        uint256 ethAmountBought,
        uint256 usdcAmountSold, 
        address router, 
        uint256 nextBestEthReturn
    );
    // No need to pass Uniswap router address to constructor b/c it's the same across all networks
    constructor(address _sushiAddress, address _usdc){
        uniAddress = address(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
        sushiAddress = address(_sushiAddress);
        usdc = IERC20(_usdc);
        wethAddress = IRouter(uniAddress).WETH();
    }
    // Needed to receive refunded eth from exchange
    receive() payable external {}
    // function that fetches the return amounts from each exchange for a given swap.
    function getReturnAmounts(uint _amountIn, address[] memory _tradingPair) public view returns(uint _uniReturn, uint _sushiReturn){
        uint[] memory _uniAmounts = IRouter(uniAddress).getAmountsOut(_amountIn, _tradingPair);
        uint[] memory _sushiAmounts = IRouter(sushiAddress).getAmountsOut(_amountIn, _tradingPair);
        _uniReturn = _uniAmounts[1];
        _sushiReturn = _sushiAmounts[1];
    }
    /// @notice Function that swaps the users ETH to USDC using the exchange that offers the best price.
    function buyUSDCAtBestPrice(uint _deadline) external payable {
        // Get traiding pair
        address[] memory _pair = getTradingPair(wethAddress, address(usdc));
        // Fetch the USDC return amount for each exchange
        (uint _uniUSDCAmount, uint _sushiUSDCAmount) = getReturnAmounts(msg.value, _pair);
        // Determine which exchange offers the greater return then route the swap to that exchange.
        if(_uniUSDCAmount > _sushiUSDCAmount) {
            routeSwap(uniAddress, _uniUSDCAmount, msg.value, _deadline, _pair);
            emit USDCBought(_uniUSDCAmount, msg.value, uniAddress, _sushiUSDCAmount);
        } else {
            routeSwap(sushiAddress, _sushiUSDCAmount, msg.value, _deadline, _pair);
            emit USDCBought(_sushiUSDCAmount, msg.value, sushiAddress, _uniUSDCAmount);
        }
    }
    function sellUSDCAtBestPrice(uint _USDCAmount, uint _deadline) external {
        require(usdc.balanceOf(msg.sender) >= _USDCAmount, "Error, can't sell more USDC than owned");
        // Transfer the usdc amount from the user to this contract. User must approve this contract to transfer usdc on their behalf.
        require(usdc.transferFrom(msg.sender, address(this), _USDCAmount), 'transferFrom failed.');
        // Get traiding pair
        address[] memory _pair = getTradingPair(address(usdc), wethAddress);
        // Fetch the ETH return amount for each exchange
        (uint _uniETHAmount, uint _sushiETHAmount) = getReturnAmounts(_USDCAmount, _pair);
        // Determine which exchange offers the greater return then route the swap to that exchange.
        if(_uniETHAmount > _sushiETHAmount) {
            routeSwap(uniAddress, _uniETHAmount,  _USDCAmount, _deadline, _pair); 
            emit USDCSold(_uniETHAmount, _USDCAmount, uniAddress, _sushiETHAmount);
        } else {
            routeSwap(sushiAddress, _sushiETHAmount, _USDCAmount, _deadline, _pair);
            emit USDCSold(_sushiETHAmount, _USDCAmount, sushiAddress, _uniETHAmount);
        }       
    }
    /// Routes the swap to either the Uniswap or Sushiswap dex using their common interface.
    function routeSwap(address _router, uint _amountOut, uint _amountIn, uint _deadline, address[] memory _pair) internal {
        if(_pair[0] == address(usdc)){ 
            // approve router to spend _amountIn tokens
            require(usdc.approve(_router, _amountIn), 'approve failed.');
            IRouter(_router).swapTokensForExactETH(_amountOut, _amountIn,_pair, msg.sender, _deadline);

        } else {
            IRouter(_router).swapETHForExactTokens{ value: msg.value }(_amountOut,_pair,msg.sender, _deadline);
            // refund leftover ETH to user
            (bool success,) = msg.sender.call{ value: address(this).balance }("");
            require(success, "refund failed");
        } 
    }
    function getTradingPair(address _input, address _output) internal pure returns(address[] memory _path) {
        // get trading path for router and getReturnAmount
        _path = new address[](2);
        _path[0] = _input;
        _path[1] = _output;
    }
}