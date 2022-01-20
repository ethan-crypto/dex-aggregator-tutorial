// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
//Code for the shared dex interface of sushiSwap and uniSwap.
interface IDex {
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
    // Uniswap at index 0 and sushiswap at index 1
    IDex[2] public Dexes;
    IERC20 public immutable usdc;
    address public immutable wethAddress;
    /// @notice USDCBought event emitted on successful ETH to USDC swap. 
    event USDCBought(
        uint256 usdcAmountBought, 
        uint256 ethAmountSold,
        address dex, 
        uint256 nextBestUsdcOutput
    );
    /// @notice USDCSold event emitted on successful USDC to ETH swap.    
    event USDCSold(
        uint256 ethAmountBought,
        uint256 usdcAmountSold, 
        address dex, 
        uint256 nextBestEthOutput
    );
    constructor (address _sushiAddress, address _usdcAddress) {
        // Don't need to pass uni address to constructor b/c its the same across all networks.
        Dexes[0] = IDex(address(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D)); 
        Dexes[1] = IDex(_sushiAddress);
        wethAddress = Dexes[0].WETH();
        usdc = IERC20(_usdcAddress);
    }
    // important to recieve refunded ETH from either dex
    receive() external payable {}
    // Function that returns the index of the exchange with the highest output amount and the output amount from each exchange in an array
    function getOutputAmounts(uint _amountIn, address[] calldata _path) public view returns(uint8 _bestPriceDex, uint[] memory _amounts){
        //Create new in memory array of length 2
        _amounts = new uint[] (2);
        // fetch output amounts from each exchange
        _amounts[0] = (Dexes[0].getAmountsOut(_amountIn, _path))[1];
        _amounts[1] = (Dexes[1].getAmountsOut(_amountIn, _path))[1];
        // If sushi amount is greater than uni amount, swap order of amounts array and set dex which offers the greater output index to 1 (sushi)
        if(_amounts[1] > _amounts[0]) {
            _amounts[0] = _amounts[1];
            _amounts[1] = (Dexes[0].getAmountsOut(_amountIn, _path))[1];
            _bestPriceDex = 1;
        }
    }
    function buyUSDCAtBestPrice(uint _deadline,address[] calldata _path) external payable {
        require(_path[0] == wethAddress && _path[1] == address(usdc), "Wrong token pair array");
        // get dex with best USDC price and output amounts for each exchange
        (uint8 _dex, uint[] memory _USDCAmounts) = getOutputAmounts(msg.value, _path);
        // Route trade to dex with best USDC price
        Dexes[_dex].swapETHForExactTokens{ value: msg.value }(_USDCAmounts[0], _path, msg.sender, _deadline);
        // refund leftover ETH to user
        payable(msg.sender).transfer(address(this).balance);
        emit USDCBought(_USDCAmounts[0], msg.value, address(Dexes[_dex]), _USDCAmounts[1]);
    }
    function sellUSDCAtBestPrice(uint _USDCAmount, uint _deadline, address[] calldata _path) external {
        require(_path[1] == wethAddress && _path[0] == address(usdc), "Wrong token pair array");
        require(usdc.balanceOf(msg.sender) >= _USDCAmount, "Error, can't sell more USDC than owned");
        // Transfer the usdc amount from the user to this contract. 
        require(usdc.transferFrom(msg.sender, address(this), _USDCAmount));
        // get dex with best ETH price and output amounts for each exchange
        (uint8 _dex, uint[] memory _ETHAmounts) = getOutputAmounts(_USDCAmount, _path);
        // approve dex with best ETH price to spend USDC tokens
        require(usdc.approve(address(Dexes[_dex]), _USDCAmount), 'approve failed.');
        // Route trade to dex with best ETH price
        Dexes[_dex].swapTokensForExactETH(_ETHAmounts[0], _USDCAmount, _path, msg.sender, _deadline);
        emit USDCSold(_ETHAmounts[0], _USDCAmount, address(Dexes[_dex]), _ETHAmounts[1]);
    }
}
