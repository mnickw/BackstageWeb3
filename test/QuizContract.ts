import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("QuizContract", function () {
  async function deployQuizFixture() {
    const [owner, participant1, participant2] = await hre.ethers.getSigners();
    const BackstageToken = await hre.ethers.getContractFactory("BackstageToken");
    const backstageToken = await BackstageToken.deploy();
    await backstageToken.waitForDeployment();

    const QuizContract = await hre.ethers.getContractFactory("QuizContract");
    const quiz = await QuizContract.deploy(backstageToken.getAddress());
    await quiz.waitForDeployment();

    //await backstageToken.mint(owner.address, BigInt(1000 * 10 ** 18));

    // Send some ETH to the QuizContract so it can pay for gas/MATIC transfers
    await owner.sendTransaction({
      to: await quiz.getAddress(),
      value: hre.ethers.parseEther("15.0"), // Sends 1 ETH (can adjust as needed)
    });

    return { quiz, backstageToken, owner, participant1, participant2 };
  }

  async function deployQuizAndRestartFixture() {
    const { quiz, backstageToken, owner, participant1, participant2 } = await loadFixture(deployQuizFixture);

    await backstageToken.approve(await quiz.getAddress(), BigInt(1000 * 10 ** 18));
    await quiz.setParticipants([participant1.address, participant2.address]);

    await backstageToken.connect(participant1).approve(quiz.getAddress(), BigInt(25 * 10 ** 18));
    await quiz.connect(participant1).setAnswer([1, 2, 3, 1, 2], [5, 5, 5, 5, 5]);
    await backstageToken.connect(participant2).approve(quiz.getAddress(), BigInt(13 * 10 ** 18));
    await quiz.connect(participant2).setAnswer([1, 2, 3, 3, 3], [4, 5, 0, 0, 4]);

    await quiz.setRightAnswer([1, 2, 3, 1, 2]);

    await backstageToken.mint(owner.address, BigInt(1000 * 10 ** 18));

    await quiz.withdrawFunds();

    await quiz.restartGame();

    // Send some ETH to the QuizContract so it can pay for gas/MATIC transfers
    await owner.sendTransaction({
      to: await quiz.getAddress(),
      value: hre.ethers.parseEther("15.0"), // Sends 1 ETH (can adjust as needed)
    });

    return { quiz, backstageToken, owner, participant1, participant2 };
  }

  describe("Participation", function () {
    it("Should allow the owner to set participants and transfer tokens", async function () {
      const { quiz, backstageToken, owner, participant1 } = await loadFixture(deployQuizFixture);
      
      const participantMaticBalanceBefore = await hre.ethers.provider.getBalance(participant1.address);

      // Act
      await backstageToken.approve(quiz.getAddress(), BigInt(1000 * 10 ** 18));
      await quiz.setParticipants([participant1.address]);

      // Check participant's BackstageToken balance
      const participantBalance = await backstageToken.balanceOf(participant1.address);
      expect(participantBalance).to.equal(BigInt(25 * 10 ** 18));

      // Check contract's BackstageToken balance
      const contractTokenBalance = await backstageToken.balanceOf(await quiz.getAddress());
      expect(contractTokenBalance).to.equal(BigInt(25 * 10 ** 18));

      // Check if participant received MATIC (assuming 0.01 ether per participant)
      const participantMaticBalanceAfter = await hre.ethers.provider.getBalance(participant1.address);
      expect(participantMaticBalanceAfter).to.be.above(participantMaticBalanceBefore);
      
      // Check if the participant is added to the participants array
      const participantsArray = await quiz.participants(0);
      expect(participantsArray).to.include(participant1.address);
    });

    it("Should allow participants to submit answers and bets", async function () {
      const { quiz, backstageToken, participant1, participant2 } = await loadFixture(deployQuizFixture);

      await backstageToken.approve(quiz.getAddress(), BigInt(1000 * 10 ** 18));
      await quiz.setParticipants([participant1.address]);

      const contractBalanceBefore = await backstageToken.balanceOf(quiz.getAddress());
      const participantBalanceBefore = await backstageToken.balanceOf(participant1.address);

      await backstageToken.connect(participant1).approve(quiz.getAddress(), BigInt(25 * 10 ** 18));

      // Test with invalid answer values
      await expect(
        quiz.connect(participant1).setAnswer([0, 2, 3, 1, 2], [5, 5, 5, 5, 5])
      ).to.be.revertedWith("Answer must be between 1 and 3");

      // Test with invalid bet values
      await expect(
        quiz.connect(participant1).setAnswer([1, 2, 3, 1, 2], [-1, 5, 5, 5, 5])
      ).to.be.revertedWith("Bet must be between 0 and 5");

      // Act
      await quiz.connect(participant1).setAnswer([1, 2, 3, 1, 2], [5, 5, 5, 5, 5]);

      await backstageToken.connect(participant2).approve(quiz.getAddress(), BigInt(25 * 10 ** 18));
      // Test with a non-participant trying to submit answers
      await expect(
        quiz.connect(participant2).setAnswer([1, 2, 3, 1, 2], [5, 5, 5, 5, 5])
      ).to.be.revertedWith("You are not a participant");

      const contractBalanceAfter = await backstageToken.balanceOf(quiz.getAddress());
      expect(contractBalanceAfter).to.be.above(contractBalanceBefore);
      expect(contractBalanceAfter).to.equal(BigInt(50 * 10 ** 18));

      const participantBalanceAfter = await backstageToken.balanceOf(participant1.address);
      expect(participantBalanceBefore).to.be.above(participantBalanceAfter);
      expect(participantBalanceAfter).to.equal(BigInt(0 * 10 ** 18));
    });

    it("Should distribute prizes correctly based on correct answers", async function () {
      const { quiz, backstageToken, owner, participant1, participant2 } = await loadFixture(deployQuizFixture);

      await backstageToken.approve(quiz.getAddress(), BigInt(1000 * 10 ** 18));
      await quiz.setParticipants([participant1.address, participant2.address]);

      let contractBalance = await backstageToken.balanceOf(quiz.getAddress());
      expect(contractBalance).to.equal(BigInt(50 * 10 ** 18));
      let participant1Balance = await backstageToken.balanceOf(participant1.address);
      expect(participant1Balance).to.equal(BigInt(25 * 10 ** 18));
      let participant2Balance = await backstageToken.balanceOf(participant2.address);
      expect(participant2Balance).to.equal(BigInt(25 * 10 ** 18));

      await backstageToken.connect(participant1).approve(quiz.getAddress(), BigInt(25 * 10 ** 18));
      await quiz.connect(participant1).setAnswer([1, 2, 3, 1, 2], [5, 5, 5, 5, 5]);
      await backstageToken.connect(participant2).approve(quiz.getAddress(), BigInt(13 * 10 ** 18));
      await quiz.connect(participant2).setAnswer([1, 2, 3, 3, 3], [4, 5, 0, 0, 4]);

      contractBalance = await backstageToken.balanceOf(quiz.getAddress());
      expect(contractBalance).to.equal(BigInt(88 * 10 ** 18));
      participant1Balance = await backstageToken.balanceOf(participant1.address);
      expect(participant1Balance).to.equal(BigInt(0 * 10 ** 18));
      participant2Balance = await backstageToken.balanceOf(participant2.address);
      expect(participant2Balance).to.equal(BigInt(12 * 10 ** 18));

      await quiz.setRightAnswer([1, 2, 3, 1, 2]);

      participant1Balance = await backstageToken.balanceOf(participant1.address);
      expect(participant1Balance).to.equal(BigInt(50 * 10 ** 18)); // Assuming full correct answers
      participant2Balance = await backstageToken.balanceOf(participant2.address);
      expect(participant2Balance).to.equal(BigInt(30 * 10 ** 18)); // 12+2*(4+5)=30

      contractBalance = await backstageToken.balanceOf(quiz.getAddress());
      expect(contractBalance).to.equal(BigInt(20 * 10 ** 18)); // 88 - 50 - 18 = 20
    });
  });

  describe("getHalfOfContractBalance", function () {
    it("Should allow participants to withdraw half of the contract's token balance", async function () {
      const { quiz, backstageToken, participant1, participant2 } = await loadFixture(deployQuizFixture);

      await backstageToken.approve(await quiz.getAddress(), BigInt(1000 * 10 ** 18));
      await quiz.setParticipants([participant1.address, participant2.address]);

      await expect(quiz.connect(participant1).getHalfOfContractBalance()).to.be.revertedWith("Quiz has not ended yet");

      await backstageToken.connect(participant1).approve(quiz.getAddress(), BigInt(25 * 10 ** 18));
      await quiz.connect(participant1).setAnswer([1, 2, 3, 1, 2], [5, 5, 5, 5, 5]);
      await backstageToken.connect(participant2).approve(quiz.getAddress(), BigInt(13 * 10 ** 18));
      await quiz.connect(participant2).setAnswer([1, 2, 3, 3, 3], [4, 5, 0, 0, 4]);

      await quiz.setRightAnswer([1, 2, 3, 1, 2]);

      await quiz.connect(participant1).getHalfOfContractBalance();

      let contractBalance = await backstageToken.balanceOf(quiz.getAddress());
      expect(contractBalance).to.equal(BigInt(10 * 10 ** 18));
      let participant1Balance = await backstageToken.balanceOf(participant1.address);
      expect(participant1Balance).to.equal(BigInt(60 * 10 ** 18));
      let participant2Balance = await backstageToken.balanceOf(participant2.address);
      expect(participant2Balance).to.equal(BigInt(30 * 10 ** 18));

      // Ensure participant1 cannot withdraw again
      await expect(quiz.connect(participant1).getHalfOfContractBalance()).to.be.revertedWith("You have already withdrawn your share");

      await quiz.connect(participant2).getHalfOfContractBalance();

      contractBalance = await backstageToken.balanceOf(quiz.getAddress());
      expect(contractBalance).to.equal(BigInt(5 * 10 ** 18));
      participant1Balance = await backstageToken.balanceOf(participant1.address);
      expect(participant1Balance).to.equal(BigInt(60 * 10 ** 18));
      participant2Balance = await backstageToken.balanceOf(participant2.address);
      expect(participant2Balance).to.equal(BigInt(35 * 10 ** 18));

      // Ensure participant2 cannot withdraw again
      await expect(quiz.connect(participant2).getHalfOfContractBalance()).to.be.revertedWith("You have already withdrawn your share");
    });
  });

  describe("withdrawFunds", function () {
    it("Should allow the owner to withdraw all funds after the quiz", async function () {
      const { quiz, backstageToken, owner, participant1, participant2 } = await loadFixture(deployQuizFixture);

      let ownerBalance = await backstageToken.balanceOf(owner.address);
      expect(ownerBalance).to.equal(BigInt(1000 * 10 ** 18));

      await backstageToken.approve(await quiz.getAddress(), BigInt(1000 * 10 ** 18));
      await quiz.setParticipants([participant1.address, participant2.address]);

      await backstageToken.connect(participant1).approve(quiz.getAddress(), BigInt(25 * 10 ** 18));
      await quiz.connect(participant1).setAnswer([1, 2, 3, 1, 2], [5, 5, 5, 5, 5]);
      await backstageToken.connect(participant2).approve(quiz.getAddress(), BigInt(13 * 10 ** 18));
      await quiz.connect(participant2).setAnswer([1, 2, 3, 3, 3], [4, 5, 0, 0, 4]);

      await quiz.setRightAnswer([1, 2, 3, 1, 2]);

      let contractBalance = await backstageToken.balanceOf(quiz.getAddress());
      expect(contractBalance).to.equal(BigInt(20 * 10 ** 18));
      let participant1Balance = await backstageToken.balanceOf(participant1.address);
      expect(participant1Balance).to.equal(BigInt(50 * 10 ** 18));
      let participant2Balance = await backstageToken.balanceOf(participant2.address);
      expect(participant2Balance).to.equal(BigInt(30 * 10 ** 18));
      ownerBalance = await backstageToken.balanceOf(owner.address);
      expect(ownerBalance).to.equal(BigInt(900 * 10 ** 18));

      await quiz.withdrawFunds();

      contractBalance = await backstageToken.balanceOf(quiz.getAddress());
      expect(contractBalance).to.equal(BigInt(0 * 10 ** 18));
      participant1Balance = await backstageToken.balanceOf(participant1.address);
      expect(participant1Balance).to.equal(BigInt(50 * 10 ** 18));
      participant2Balance = await backstageToken.balanceOf(participant2.address);
      expect(participant2Balance).to.equal(BigInt(30 * 10 ** 18));
      ownerBalance = await backstageToken.balanceOf(owner.address);
      expect(ownerBalance).to.equal(BigInt(920 * 10 ** 18));
    });

    it("Should allow the owner to withdraw all MATIC", async function () {
      const { quiz, owner } = await loadFixture(deployQuizFixture);

      const ownerBalanceBefore = await hre.ethers.provider.getBalance(owner.address);

      await quiz.withdrawFunds();

      const ownerBalanceAfter = await hre.ethers.provider.getBalance(owner.address);
      expect(ownerBalanceAfter).to.be.above(ownerBalanceBefore);

      const contractMaticBalance = await hre.ethers.provider.getBalance(await quiz.getAddress());
      expect(contractMaticBalance).to.equal(BigInt(0));
    });
  });

  describe("Participation after restart", function () {
    it("Should allow the owner to set participants and transfer tokens", async function () {
      const { quiz, backstageToken, owner, participant1 } = await deployQuizAndRestartFixture();
      
      const participantMaticBalanceBefore = await hre.ethers.provider.getBalance(participant1.address);

      // Act
      await backstageToken.approve(quiz.getAddress(), BigInt(1000 * 10 ** 18));
      await quiz.setParticipants([participant1.address]);

      // Check participant's BackstageToken balance
      const participantBalance = await backstageToken.balanceOf(participant1.address);
      expect(participantBalance).to.equal(BigInt(75 * 10 ** 18));

      // Check contract's BackstageToken balance
      const contractTokenBalance = await backstageToken.balanceOf(await quiz.getAddress());
      expect(contractTokenBalance).to.equal(BigInt(25 * 10 ** 18));

      // Check if participant received MATIC (assuming 0.01 ether per participant)
      const participantMaticBalanceAfter = await hre.ethers.provider.getBalance(participant1.address);
      expect(participantMaticBalanceAfter).to.be.above(participantMaticBalanceBefore);
      
      // Check if the participant is added to the participants array
      const participantsArray = await quiz.participants(0);
      expect(participantsArray).to.include(participant1.address);
    });

    it("Should allow participants to submit answers and bets", async function () {
      const { quiz, backstageToken, participant1, participant2 } = await deployQuizAndRestartFixture();

      await backstageToken.approve(quiz.getAddress(), BigInt(1000 * 10 ** 18));
      await quiz.setParticipants([participant1.address]);

      const contractBalanceBefore = await backstageToken.balanceOf(quiz.getAddress());
      const participantBalanceBefore = await backstageToken.balanceOf(participant1.address);

      await backstageToken.connect(participant1).approve(quiz.getAddress(), BigInt(25 * 10 ** 18));

      // Test with invalid answer values
      await expect(
        quiz.connect(participant1).setAnswer([0, 2, 3, 1, 2], [5, 5, 5, 5, 5])
      ).to.be.revertedWith("Answer must be between 1 and 3");

      // Test with invalid bet values
      await expect(
        quiz.connect(participant1).setAnswer([1, 2, 3, 1, 2], [-1, 5, 5, 5, 5])
      ).to.be.revertedWith("Bet must be between 0 and 5");

      // Act
      await quiz.connect(participant1).setAnswer([1, 2, 3, 1, 2], [5, 5, 5, 5, 5]);

      await backstageToken.connect(participant2).approve(quiz.getAddress(), BigInt(25 * 10 ** 18));
      // Test with a non-participant trying to submit answers
      await expect(
        quiz.connect(participant2).setAnswer([1, 2, 3, 1, 2], [5, 5, 5, 5, 5])
      ).to.be.revertedWith("You are not a participant");

      const contractBalanceAfter = await backstageToken.balanceOf(quiz.getAddress());
      expect(contractBalanceAfter).to.be.above(contractBalanceBefore);
      expect(contractBalanceAfter).to.equal(BigInt(50 * 10 ** 18));

      const participantBalanceAfter = await backstageToken.balanceOf(participant1.address);
      expect(participantBalanceBefore).to.be.above(participantBalanceAfter);
      expect(participantBalanceAfter).to.equal(BigInt(50 * 10 ** 18));
    });

    it("Should distribute prizes correctly based on correct answers", async function () {
      const { quiz, backstageToken, owner, participant1, participant2 } = await deployQuizAndRestartFixture();

      await backstageToken.approve(quiz.getAddress(), BigInt(1000 * 10 ** 18));
      await quiz.setParticipants([participant1.address, participant2.address]);

      let contractBalance = await backstageToken.balanceOf(quiz.getAddress());
      expect(contractBalance).to.equal(BigInt(50 * 10 ** 18));
      let participant1Balance = await backstageToken.balanceOf(participant1.address);
      expect(participant1Balance).to.equal(BigInt(75 * 10 ** 18));
      let participant2Balance = await backstageToken.balanceOf(participant2.address);
      expect(participant2Balance).to.equal(BigInt(55 * 10 ** 18));

      await backstageToken.connect(participant1).approve(quiz.getAddress(), BigInt(25 * 10 ** 18));
      await quiz.connect(participant1).setAnswer([1, 2, 3, 1, 2], [5, 5, 5, 5, 5]);
      await backstageToken.connect(participant2).approve(quiz.getAddress(), BigInt(13 * 10 ** 18));
      await quiz.connect(participant2).setAnswer([1, 2, 3, 3, 3], [4, 5, 0, 0, 4]);

      contractBalance = await backstageToken.balanceOf(quiz.getAddress());
      expect(contractBalance).to.equal(BigInt(88 * 10 ** 18));
      participant1Balance = await backstageToken.balanceOf(participant1.address);
      expect(participant1Balance).to.equal(BigInt(50 * 10 ** 18));
      participant2Balance = await backstageToken.balanceOf(participant2.address);
      expect(participant2Balance).to.equal(BigInt(42 * 10 ** 18));

      await quiz.setRightAnswer([1, 2, 3, 1, 2]);

      participant1Balance = await backstageToken.balanceOf(participant1.address);
      expect(participant1Balance).to.equal(BigInt(100 * 10 ** 18)); // Assuming full correct answers
      participant2Balance = await backstageToken.balanceOf(participant2.address);
      expect(participant2Balance).to.equal(BigInt(60 * 10 ** 18)); // 12+2*(4+5)=30

      contractBalance = await backstageToken.balanceOf(quiz.getAddress());
      expect(contractBalance).to.equal(BigInt(20 * 10 ** 18)); // 88 - 50 - 18 = 20
    });
  });

  describe("getHalfOfContractBalance after restart", function () {
    it("Should allow participants to withdraw half of the contract's token balance", async function () {
      const { quiz, backstageToken, participant1, participant2 } = await deployQuizAndRestartFixture();

      await backstageToken.approve(await quiz.getAddress(), BigInt(1000 * 10 ** 18));
      await quiz.setParticipants([participant1.address, participant2.address]);

      await expect(quiz.connect(participant1).getHalfOfContractBalance()).to.be.revertedWith("Quiz has not ended yet");

      await backstageToken.connect(participant1).approve(quiz.getAddress(), BigInt(25 * 10 ** 18));
      await quiz.connect(participant1).setAnswer([1, 2, 3, 1, 2], [5, 5, 5, 5, 5]);
      await backstageToken.connect(participant2).approve(quiz.getAddress(), BigInt(13 * 10 ** 18));
      await quiz.connect(participant2).setAnswer([1, 2, 3, 3, 3], [4, 5, 0, 0, 4]);

      await quiz.setRightAnswer([1, 2, 3, 1, 2]);

      await quiz.connect(participant1).getHalfOfContractBalance();

      let contractBalance = await backstageToken.balanceOf(quiz.getAddress());
      expect(contractBalance).to.equal(BigInt(10 * 10 ** 18));
      let participant1Balance = await backstageToken.balanceOf(participant1.address);
      expect(participant1Balance).to.equal(BigInt(110 * 10 ** 18));
      let participant2Balance = await backstageToken.balanceOf(participant2.address);
      expect(participant2Balance).to.equal(BigInt(60 * 10 ** 18));

      // Ensure participant1 cannot withdraw again
      await expect(quiz.connect(participant1).getHalfOfContractBalance()).to.be.revertedWith("You have already withdrawn your share");

      await quiz.connect(participant2).getHalfOfContractBalance();

      contractBalance = await backstageToken.balanceOf(quiz.getAddress());
      expect(contractBalance).to.equal(BigInt(5 * 10 ** 18));
      participant1Balance = await backstageToken.balanceOf(participant1.address);
      expect(participant1Balance).to.equal(BigInt(110 * 10 ** 18));
      participant2Balance = await backstageToken.balanceOf(participant2.address);
      expect(participant2Balance).to.equal(BigInt(65 * 10 ** 18));

      // Ensure participant2 cannot withdraw again
      await expect(quiz.connect(participant2).getHalfOfContractBalance()).to.be.revertedWith("You have already withdrawn your share");
    });
  });

  describe("withdrawFunds after restart", function () {
    it("Should allow the owner to withdraw all funds after the quiz", async function () {
      const { quiz, backstageToken, owner, participant1, participant2 } = await deployQuizAndRestartFixture();

      let ownerBalance = await backstageToken.balanceOf(owner.address);
      expect(ownerBalance).to.equal(BigInt(1920 * 10 ** 18));

      await backstageToken.approve(await quiz.getAddress(), BigInt(1000 * 10 ** 18));
      await quiz.setParticipants([participant1.address, participant2.address]);

      await backstageToken.connect(participant1).approve(quiz.getAddress(), BigInt(25 * 10 ** 18));
      await quiz.connect(participant1).setAnswer([1, 2, 3, 1, 2], [5, 5, 5, 5, 5]);
      await backstageToken.connect(participant2).approve(quiz.getAddress(), BigInt(13 * 10 ** 18));
      await quiz.connect(participant2).setAnswer([1, 2, 3, 3, 3], [4, 5, 0, 0, 4]);

      await quiz.setRightAnswer([1, 2, 3, 1, 2]);

      let contractBalance = await backstageToken.balanceOf(quiz.getAddress());
      expect(contractBalance).to.equal(BigInt(20 * 10 ** 18));
      let participant1Balance = await backstageToken.balanceOf(participant1.address);
      expect(participant1Balance).to.equal(BigInt(100 * 10 ** 18));
      let participant2Balance = await backstageToken.balanceOf(participant2.address);
      expect(participant2Balance).to.equal(BigInt(60 * 10 ** 18));
      ownerBalance = await backstageToken.balanceOf(owner.address);
      expect(ownerBalance).to.equal(BigInt(1820 * 10 ** 18));

      await quiz.withdrawFunds();

      contractBalance = await backstageToken.balanceOf(quiz.getAddress());
      expect(contractBalance).to.equal(BigInt(0 * 10 ** 18));
      participant1Balance = await backstageToken.balanceOf(participant1.address);
      expect(participant1Balance).to.equal(BigInt(100 * 10 ** 18));
      participant2Balance = await backstageToken.balanceOf(participant2.address);
      expect(participant2Balance).to.equal(BigInt(60 * 10 ** 18));
      ownerBalance = await backstageToken.balanceOf(owner.address);
      expect(ownerBalance).to.equal(BigInt(1840 * 10 ** 18));
    });

    it("Should allow the owner to withdraw all MATIC", async function () {
      const { quiz, owner } = await deployQuizAndRestartFixture();

      const ownerBalanceBefore = await hre.ethers.provider.getBalance(owner.address);

      await quiz.withdrawFunds();

      const ownerBalanceAfter = await hre.ethers.provider.getBalance(owner.address);
      expect(ownerBalanceAfter).to.be.above(ownerBalanceBefore);

      const contractMaticBalance = await hre.ethers.provider.getBalance(await quiz.getAddress());
      expect(contractMaticBalance).to.equal(BigInt(0));
    });
  });
});
