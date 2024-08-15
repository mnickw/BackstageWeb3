// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract QuizContract is Ownable {
    IERC20 public backstageToken;
    uint256 public constant TOKEN_AMOUNT = 25 * 10**18; // 25 Tokens (assuming 18 decimals)
    uint256 public constant MATIC_AMOUNT = 0.01 ether; // Example Matic amount for gas fees
    bool public quizEnded = false;

    struct Answer {
        int8[5] answers;
        int8[5] bets;
        bool hasWithdrawn;
        bool isParticipant;
    }

    mapping(address => Answer) private _answers;
    address[] public participants;

    // Constructor initializes the contract with the address of the token and sets the initial owner
    constructor(address _backstageTokenAddress) payable Ownable(msg.sender) {
        backstageToken = IERC20(_backstageTokenAddress);
    }

    // Function to set participants and handle token transfers
    // use backstageToken.approve(quiz.getAddress(), BigInt(1000 * 10 ** 18)); before calling next func
    function setParticipants(address[] memory _participants) public onlyOwner {
        for (uint256 i = 0; i < _participants.length; i++) {
            address participant = _participants[i];

            // Mark the participant as an official participant
            _answers[participant].isParticipant = true;

            // Transfer 25 BackstageTokens to the participant
            require(
                backstageToken.transferFrom(owner(), participant, TOKEN_AMOUNT),
                "Token transfer to participant failed"
            );

            // Transfer some Matic to the participant for gas
            (bool sentMatic, ) = participant.call{value: MATIC_AMOUNT}("");
            require(sentMatic, "Matic transfer to participant failed");

            // Transfer 25 BackstageTokens to this contract
            require(
                backstageToken.transferFrom(owner(), address(this), TOKEN_AMOUNT),
                "Token transfer to contract failed"
            );

            // Add to the participants array
            participants.push(participant);
        }
    }

    // Function for participants to submit their answers and bets
    // use backstageToken.connect(participant1).approve(quiz.getAddress(), BigInt(25 * 10 ** 18)); before calling next func
    function setAnswer(int8[5] memory _answersArray, int8[5] memory _bets) public {
        require(_answers[msg.sender].isParticipant, "You are not a participant");

        uint256 totalBet = 0;
        for (uint256 i = 0; i < 5; i++) {
            require(_answersArray[i] >= 1 && _answersArray[i] <= 3, "Answer must be between 1 and 3");
            require(_bets[i] >= 0 && _bets[i] <= 5, "Bet must be between 0 and 5");

            totalBet += uint256(int256(_bets[i]));
        }

        // Transfer tokens from participant to contract based on the total bet
        require(backstageToken.transferFrom(msg.sender, address(this), totalBet * 10**18), "Token transfer failed");

        _answers[msg.sender].answers = _answersArray;
        _answers[msg.sender].bets = _bets;
    }

    // Function to set the correct answer and distribute prizes
    function setRightAnswer(int8[5] memory correctAnswer) public onlyOwner {
        require(!quizEnded, "Quiz has already ended");

        for (uint256 i = 0; i < participants.length; i++) {
            address participant = participants[i];
            Answer memory ans = _answers[participant];
            uint256 winPrize = 0;

            for (uint256 j = 0; j < 5; j++) {
                if (ans.answers[j] == correctAnswer[j]) {
                    winPrize += uint256(int256(ans.bets[j])) * 2;
                }
            }

            // Transfer the winPrize to the participant
            if (winPrize > 0) {
                require(backstageToken.transfer(participant, winPrize * 10**18), "Token transfer failed");
            }
        }

        quizEnded = true;
    }

    // Function to get half of the contract's token balance after the quiz has ended
    function getHalfOfContractBalance() public {
        require(quizEnded, "Quiz has not ended yet");
        require(_answers[msg.sender].isParticipant, "You are not a participant");
        require(!_answers[msg.sender].hasWithdrawn, "You have already withdrawn your share");

        uint256 halfBalance = backstageToken.balanceOf(address(this)) / 2;
        require(
            backstageToken.transfer(msg.sender, halfBalance),
            "Token transfer failed"
        );
        _answers[msg.sender].hasWithdrawn = true;
    }

    // Function for the owner to withdraw tokens and MATIC from the contract
    function withdrawFunds() public onlyOwner {
        // Withdraw all MATIC from the contract
        uint256 contractMaticBalance = address(this).balance;
        if (contractMaticBalance > 0) {
            (bool success, ) = owner().call{value: contractMaticBalance}("");
            require(success, "MATIC withdrawal failed");
        }

        // Withdraw all BackstageTokens from the contract
        uint256 contractTokenBalance = backstageToken.balanceOf(address(this));
        if (contractTokenBalance > 0) {
            require(
                backstageToken.transfer(owner(), contractTokenBalance),
                "Token withdrawal failed"
            );
        }
    }

    // Function to reset the game for a new round
    function restartGame() public onlyOwner {
        require(quizEnded, "Quiz is still ongoing");

        // Reset the game state
        quizEnded = false;

        // Reset each participant's status
        for (uint256 i = 0; i < participants.length; i++) {
            _answers[participants[i]].hasWithdrawn = false;
            _answers[participants[i]].isParticipant = false;
        }

        // Clear the participants array
        delete participants;
    }

    // Fallback function to allow the contract to receive MATIC
    receive() external payable {}
}
