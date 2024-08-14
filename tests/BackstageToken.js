const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BackstageToken", function () {
    let BackstageToken, backstageToken, owner, addr1;

    beforeEach(async function () {
        [owner, addr1] = await ethers.getSigners();
        BackstageToken = await ethers.getContractFactory("BackstageToken");
        backstageToken = await BackstageToken.deploy();
        await backstageToken.deployed();
    });

    it("Should assign the total supply of tokens to the owner", async function () {
        const ownerBalance = await backstageToken.balanceOf(owner.address);
        expect(await backstageToken.totalSupply()).to.equal(ownerBalance);
    });

    it("Should allow the owner to mint new tokens", async function () {
        await backstageToken.mint(addr1.address, 500);
        const addr1Balance = await backstageToken.balanceOf(addr1.address);
        expect(addr1Balance).to.equal(500);
    });

    it("Should allow token burning", async function () {
        await backstageToken.burn(200);
        const ownerBalance = await backstageToken.balanceOf(owner.address);
        expect(await backstageToken.totalSupply()).to.equal(ownerBalance);
        expect(await backstageToken.totalSupply()).to.equal(800); // initial 1000 - 200 burned
    });

    it("Should not allow non-owners to mint tokens", async function () {
        await expect(
            backstageToken.connect(addr1).mint(addr1.address, 500)
        ).to.be.revertedWith("Ownable: caller is not the owner");
    });
});
