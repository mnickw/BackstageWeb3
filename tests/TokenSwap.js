const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenSwap", function () {
    let BackstageToken, backstageToken, TokenSwap, tokenSwap;
    let owner, addr1;

    beforeEach(async function () {
        [owner, addr1] = await ethers.getSigners();
        BackstageToken = await ethers.getContractFactory("BackstageToken");
        backstageToken = await BackstageToken.deploy();
        await backstageToken.deployed();

        TokenSwap = await ethers.getContractFactory("TokenSwap");
        tokenSwap = await TokenSwap.deploy(backstageToken.address, ethers.utils.parseUnits("0.01", 18));
        await tokenSwap.deployed();

        // Mint tokens and approve TokenSwap contract to spend owner's tokens
        await backstageToken.mint(owner.address, ethers.utils.parseUnits("1000", 18));
        await backstageToken.approve(tokenSwap.address, ethers.utils.parseUnits("1000", 18));

        // Deposit MATIC into the swap contract
        await tokenSwap.depositMatic({ value: ethers.utils.parseUnits("1", 18) });
    });

    it("Should allow a user to swap tokens for MATIC", async function () {
        await backstageToken.transfer(addr1.address, ethers.utils.parseUnits("100", 18));
        await backstageToken.connect(addr1).approve(tokenSwap.address, ethers.utils.parseUnits("100", 18));

        const initialMaticBalance = await ethers.provider.getBalance(addr1.address);

        await tokenSwap.connect(addr1).swap(ethers.utils.parseUnits("50", 18));

        const finalMaticBalance = await ethers.provider.getBalance(addr1.address);
        const contractBalance = await ethers.provider.getBalance(tokenSwap.address);

        expect(finalMaticBalance).to.be.gt(initialMaticBalance);
        expect(contractBalance).to.be.lt(ethers.utils.parseUnits("1", 18));
    });

    it("Should allow the owner to withdraw MATIC", async function () {
        const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
        await tokenSwap.withdrawMatic(ethers.utils.parseUnits("0.5", 18));

        const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
        expect(finalOwnerBalance).to.be.gt(initialOwnerBalance);
    });

    it("Should allow the owner to withdraw tokens", async function () {
        await tokenSwap.swap(ethers.utils.parseUnits("50", 18));
        const contractTokenBalance = await backstageToken.balanceOf(tokenSwap.address);

        await tokenSwap.withdrawTokens(contractTokenBalance);

        const ownerBalance = await backstageToken.balanceOf(owner.address);
        expect(ownerBalance).to.be.equal(ethers.utils.parseUnits("950", 18));
    });
});
