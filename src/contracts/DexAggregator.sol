// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
//Code for the shared dex interface of sushiSwap and uniSwap.
interface IDex {
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
    address public immutable sushiAddress;
    address public immutable usdcAddress;
    address public immutable wethAddress;
    address public constant UNI_ADDRESS = address(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
    /// @notice USDCBought event emitted on successful ETH to USDC swap. 
    event USDCBought(
        uint256 usdcAmountBought, 
        uint256 ethAmountSold,
        address dex, 
        uint256 nextBestUsdcReturn
    );
    /// @notice USDCSold event emitted on successful USDC to ETH swap.    
    event USDCSold(
        uint256 ethAmountBought,
        uint256 usdcAmountSold, 
        address dex, 
        uint256 nextBestEthReturn
    );
    constructor (address _sushiAddress, address _usdcAddress, address _wethAddress) {
        sushiAddress = _sushiAddress;
        usdcAddress = _usdcAddress;
        wethAddress = _wethAddress;
    }
    receive() external payable {}
    function getReturnAmounts(uint _amountIn, address[] calldata _path) public view returns(uint _uniAmount, uint _sushiAmount){
        uint[] memory _uniAmounts = IDex(UNI_ADDRESS).getAmountsOut(_amountIn, _path);
        uint[] memory _sushiAmounts = IDex(sushiAddress).getAmountsOut(_amountIn, _path);
        _uniAmount = _uniAmounts[1];
        _sushiAmount = _sushiAmounts[1];
    }
    function buyUSDCAtBestPrice(uint _deadline,address[] calldata _path) external payable {
        require(_path[0] == wethAddress && _path[1] == usdcAddress, "Wrong token pair array");
        // get USDC return amounts for each exchange
        (uint _uniUSDCAmount, uint _sushiUSDCAmount) = getReturnAmounts(msg.value, _path);
        // determine which exchange offers the greater return then route the swap to that exchange.
        if(_uniUSDCAmount > _sushiUSDCAmount) {
            IDex(UNI_ADDRESS).swapETHForExactTokens{ value: msg.value }(_uniUSDCAmount, _path, msg.sender, _deadline);
            emit USDCBought(_uniUSDCAmount, msg.value, UNI_ADDRESS, _sushiUSDCAmount);
        } else {
            IDex(sushiAddress).swapETHForExactTokens{ value: msg.value }(_sushiUSDCAmount, _path, msg.sender, _deadline);
            emit USDCBought(_sushiUSDCAmount, msg.value, sushiAddress, _uniUSDCAmount);
        }
        // refund leftover ETH to user
        payable(msg.sender).transfer(address(this).balance);
    }
    function sellUSDCAtBestPrice(uint _USDCAmount, uint _deadline, address[] calldata _path) external {
        require(_path[1] == wethAddress && _path[0] == usdcAddress, "Wrong token pair array");
        require(IERC20(usdcAddress).balanceOf(msg.sender) >= _USDCAmount, "Error, can't sell more USDC than owned");
        // Transfer the usdc amount from the user to this contract. 
        require(IERC20(usdcAddress).transferFrom(msg.sender, address(this), _USDCAmount));
        // get ETH return amounts for each exchange
        (uint _uniETHAmount, uint _sushiETHAmount) = getReturnAmounts(_USDCAmount, _path);
        // determine which exchange offers the greater return then route the swap to that exchange.
        if(_uniETHAmount > _sushiETHAmount) {
            // approve Uni to spend USDC tokens
            require(IERC20(usdcAddress).approve(UNI_ADDRESS, _USDCAmount), 'approve failed.');
            IDex(UNI_ADDRESS).swapTokensForExactETH(_uniETHAmount, _USDCAmount, _path, msg.sender, _deadline);
            emit USDCSold(_uniETHAmount, _USDCAmount, UNI_ADDRESS, _sushiETHAmount);
        } else {
            // approve Sushi to spend USDC tokens
            require(IERC20(usdcAddress).approve(sushiAddress, _USDCAmount), 'approve failed.');
            IDex(sushiAddress).swapTokensForExactETH(_sushiETHAmount, _USDCAmount, _path, msg.sender, _deadline);
            emit USDCSold(_sushiETHAmount, _USDCAmount, sushiAddress, _uniETHAmount);
        }
    }
}
