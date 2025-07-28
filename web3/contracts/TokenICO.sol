// SPDX-License-Identifier: MIT 
pragma solidity ^0.8.0;


interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns(bool);
    function balanceOf(address account) external view returns(uint256);
    function transferFrom(address sender,address recipient,uint256 amount) external returns(bool);
    function symbol() external view returns(string memory);
    function decimals() external view returns(uint8);
}

contract TokenICO {
    address public immutable owner;
    address public saletoken;
    uint256 public ethPriceForToken = 0.001 ether;
    uint256 public tokensSold;

    //购买
    event TokensPurchased(address indexed buyer,uint256 amountPaid ,uint256 tokensBought);
    //价格更新
    event PriceUpdated(uint256 oldPrice, uint256 newPrice);
    //设置token
    event SaleTokenSet(address indexed token);
    
    error OnlyOwner();
    error InvalidPrice();
    error InvalidAddress();
    error NoEthSent();
    error SaleTokenNotSet();
    error TokenTransferFailed();
    error NoTokenToWithdraw();
    error CannotResuceSaleToken();
    error NoTokensToRescue();
    error UseTokenFuncation();

    //装饰器
    modifier onlyOwner() {
        if(msg.sender != owner) revert OnlyOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
        
    }

    receive() external payable{
        revert UseTokenFuncation();
    }

    //更新价格
    function updatetokenPrice(uint256 newPrice) external onlyOwner{
        if(newPrice == 0 )revert InvalidPrice();
        uint256 oldPrice = ethPriceForToken;
        ethPriceForToken = newPrice;
        emit PriceUpdated(oldPrice, newPrice);
    }

    //设置token
    function setSaleToken(address _token) external onlyOwner{
        if(_token == address(0)) revert InvalidAddress();
        saletoken = _token;
        emit SaleTokenSet(_token);
    } 

    function withdrawAllTokens() external onlyOwner{
        address token  = saletoken;
        uint256 balance = IERC20(token).balanceOf(address(this));

        if(balance ==0) revert NoTokenToWithdraw();
        if(!IERC20(token).transfer(owner,balance)) revert TokenTransferFailed();
    }

    //用户函数
    function buyToken() external payable {
        if(msg.value == 0 ) revert NoEthSent();
        address token = saletoken;
        if(token == address(0)) revert SaleTokenNotSet();
        IERC20 tokenContract = IERC20(token);
        uint8 decimals = tokenContract.decimals();
        uint256 tokenAmount = (msg.value*(10 ** decimals))/ ethPriceForToken;
        unchecked {
            tokensSold += tokenAmount;
        }
        if(!tokenContract.transfer(msg.sender,tokenAmount)) revert TokenTransferFailed();
        
        (bool success,) = owner.call{value:msg.value}("");
        if(!success) revert TokenTransferFailed();
        emit TokensPurchased(msg.sender, msg.value, tokenAmount);

    }

    function rescueToken(address tokenAddress) external onlyOwner {
        // if(tokenAddress == address(0)) revert InvalidAddress();
        if(tokenAddress == saletoken) revert CannotResuceSaleToken();
        IERC20 tokenContract = IERC20(tokenAddress);
        uint256 balance = tokenContract.balanceOf(address(this));
        if(balance == 0) revert NoTokensToRescue();
        if(!tokenContract.transfer(owner,balance)) revert TokenTransferFailed();
    }
    
    //只读函数
    function getContractInfo() external view returns(
        address tokenAddress,
        string memory tokenSymbol,
        uint8 tokenDecimals,
        uint256 tokenBalance,
        uint256 tokenPrice,
        uint256 tokenSold

    ){
        address token = saletoken;
        IERC20 tokenContract = IERC20(token);
        return(
            token,
            tokenContract.symbol(),
            tokenContract.decimals(),
            tokenContract.balanceOf(address(this)),
            ethPriceForToken,
            tokensSold
        );
    }
}