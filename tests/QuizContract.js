const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("QuizContract", function () {
    let BackstageToken, backstageToken, QuizContract, quizContract;
    let owner, addr1, addr2, addr3;

    beforeEach(async function () {
        [owner, addr1, addr2, addr3] = await ethers.getSigners();
        BackstageToken = await ethers.getContractFactory("BackstageToken");
        backstageToken = await BackstageToken.deploy();
        await backstageToken.deployed();

        QuizContract = await ethers.getContractFactory("QuizContract");
        quizContract = await QuizContract.deploy(backstageToken.address);
        await quizContract.deployed();

        // Mint some tokens to the owner for testing
        await backstageToken.mint(owner.address, ethers.utils.parseUnits("1000", 18));

        // Approve token transfers by the contract
        await backstageToken.approve(quizContract.address, ethers.utils.parseUnits("1000", 18));
    });

    it("Should set participants and transfer tokens and MATIC", async function () {
        await quizContract.setParticipants([addr1.address, addr2.address]);

        expect(await backstageToken.balanceOf(addr1.address)).to.equal(ethers.utils.parseUnits("25", 18));
        expect(await backstageToken.balanceOf(addr2.address)).to.equal(ethers.utils.parseUnits("25", 18));

        expect(await backstageToken.balanceOf(quizContract.address)).to.equal(ethers.utils.parseUnits("50", 18));
    });

    it("Should allow participants to set answers and bets", async function () {
        await quizContract.setParticipants([addr1.address]);

        await backstageToken.connect(addr1).approve(quizContract.address, ethers.utils.parseUnits("25", 18));
        
        const answers = [1, 2, 3, 1, 2];
        const bets = [1, 2, 3, 1, 2];

        await quizContract.connect(addr1).setAnswer(answers, bets);

        // Validate the internal storage (indirectly by ensuring no error)
        const participant = await quizContract.participants(0);
        expect(participant).to.equal(addr1.address);
    });

    it("Should distribute prizes correctly", async function () {
        await quizContract.setParticipants([addr1.address]);

        const answers = [1, 2, 3, 1, 2];
        const correctAnswers = [1, 2, 3, 1, 2];
        const bets = [1, 2, 3, 1, 2];

        await backstageToken.connect(addr1).approve(quizContract.address, ethers.utils.parseUnits("25", 18));
        await quizContract.connect(addr1).setAnswer(answers, bets);

        await quizContract.setRightAnswer(correctAnswers);

        const addr1Balance = await backstageToken.balanceOf(addr1.address);
        expect(addr1Balance).to.be.gt(ethers.utils.parseUnits("25", 18)); // Check if addr1 got prize
    });

    it("Should allow participants to withdraw half of contract balance", async function () {
        await quizContract.setParticipants([addr1.address]);
        await quizContract.setRightAnswer([1, 2, 3, 1, 2]);

        await quizContract.connect(addr1).getHalfOfContractBalance();

        const contractBalance = await backstageToken.balanceOf(quizContract.address);
        const addr1Balance = await backstageToken.balanceOf(addr1.address);

        expect(addr1Balance).to.be.gt(ethers.utils.parseUnits("25", 18)); // Participant got some tokens
        expect(contractBalance).to.be.lt(ethers.utils.parseUnits("50", 18)); // Contract balance reduced
    });

    it("Should allow the owner to withdraw all tokens and MATIC", async function () {
        await quizContract.setParticipants([addr1.address]);
        await quizContract.setRightAnswer([1, 2, 3, 1, 2]);

        const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
        await quizContract.withdrawFunds();

        const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
        expect(finalOwnerBalance).to.be.gt(initialOwnerBalance);
    });

    it("Should restart the game correctly", async function () {
        await quizContract.setParticipants([addr1.address]);
        await quizContract.setRightAnswer([1, 2, 3, 1, 2]);

        await quizContract.restartGame();

        expect(await quizContract.quizEnded()).to.be.false;
        const participant = await quizContract.participants(0);
        expect(participant).to.be.undefined;
    });
});
