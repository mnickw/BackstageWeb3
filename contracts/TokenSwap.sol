// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TokenSwap is Ownable {
    IERC20 public backstageToken;
    uint256 public constant RATE = 5 * 10**13; // 1 bst = 0.00005 Matic

    constructor(IERC20 _token) 
        Ownable(msg.sender)
    {
        backstageToken = _token;
    }

    function swap(uint256 tokenAmount) public {
        uint256 maticAmount = tokenAmount * RATE;
        require(address(this).balance >= maticAmount, "Not enough MATIC in contract");

        backstageToken.transferFrom(msg.sender, address(this), tokenAmount * 10 ** 18);
        payable(msg.sender).transfer(maticAmount);
    }

    function depositMatic() public payable onlyOwner {}

    function withdrawMatic(uint256 amount) public onlyOwner {
        payable(owner()).transfer(amount);
    }

    function withdrawTokens(uint256 amount) public onlyOwner {
        backstageToken.transfer(owner(), amount);
    }
}
