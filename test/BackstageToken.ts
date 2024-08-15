import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("BackstageToken", function () {
  async function deployTokenFixture() {
    const [owner, otherAccount] = await hre.ethers.getSigners();
    const BackstageToken = await hre.ethers.getContractFactory("BackstageToken");
    const token = await BackstageToken.deploy();

    return { token, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should assign the initial supply to the owner", async function () {
      const { token, owner } = await loadFixture(deployTokenFixture);
      const ownerBalance = await token.balanceOf(owner.address);
      expect(ownerBalance).to.equal(BigInt(1000 * 10 ** 18));
    });
  });

  describe("Minting", function () {
    it("Should allow the owner to mint tokens", async function () {
      const { token, owner, otherAccount } = await loadFixture(deployTokenFixture);
      await token.mint(otherAccount.address, BigInt(500 * 10 ** 18));
      const balance = await token.balanceOf(otherAccount.address);
      expect(balance).to.equal(BigInt(500 * 10 ** 18));
    });

    it("Should not allow non-owners to mint tokens", async function () {
      const { token, otherAccount } = await loadFixture(deployTokenFixture);
      await expect(
        token.connect(otherAccount).mint(otherAccount.address, BigInt(500 * 10 ** 18))
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });
  });
});
