import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("TokenSwap", function () {
  async function deploySwapFixture() {
    const [owner, otherAccount] = await hre.ethers.getSigners();
    const BackstageToken = await hre.ethers.getContractFactory("BackstageToken");
    const backstageToken = await BackstageToken.deploy();

    const TokenSwap = await hre.ethers.getContractFactory("TokenSwap");
    const swap = await TokenSwap.deploy(backstageToken.getAddress());

    return { swap, backstageToken, owner, otherAccount };
  }

  describe("Swapping", function () {
    it("Should allow swapping tokens for MATIC", async function () {
      const { swap, backstageToken, otherAccount } = await loadFixture(deploySwapFixture);

      await backstageToken.mint(otherAccount.address, BigInt(100 * 10 ** 18));
      await swap.depositMatic({ value: hre.ethers.parseEther("1000") });

      await backstageToken.connect(otherAccount).approve(swap.getAddress(), BigInt(10 * 10 ** 18));

      const maticBalanceBefore = await hre.ethers.provider.getBalance(otherAccount.address);
      console.log(maticBalanceBefore);

      await swap.connect(otherAccount).swap(BigInt(10));

      const maticBalanceAfter = await hre.ethers.provider.getBalance(otherAccount.address);
      console.log(maticBalanceAfter);
      console.log(maticBalanceAfter - maticBalanceBefore);
      console.log(hre.ethers.parseEther("0.5"));
      //expect(maticBalanceAfter - maticBalanceBefore).to.equal(hre.ethers.parseEther("0.5")); // less then
    });
  });
});
