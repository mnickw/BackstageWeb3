import React, { useState } from 'react';
import { Web3Provider } from '@ethersproject/providers';
import { Contract } from '@ethersproject/contracts';
import { parseUnits } from '@ethersproject/units';

const Quiz = () => {
  const [answers, setAnswers] = useState(Array(5).fill(null));
  const [bets, setBets] = useState(Array(5).fill(0));

  const handleAnswerChange = (index, value) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleBetChange = (index, value) => {
    const newBets = [...bets];
    newBets[index] = Math.min(Math.max(value, 0), 5); // Ensure bet is between 0 and 5
    setBets(newBets);
  };

  const handleFinish = async () => {
    const totalBets = bets.reduce((acc, bet) => acc + bet, 0);
    
    // Approve token transfer
    const tokenAddress = '0x3f83752167a7DA47A86308C3FB55d005Ba750b9c';
    const tokenABI = [
      "function approve(address spender, uint256 amount) public returns (bool)",
    ];
    const contractAddress = 'YOUR_CONTRACT_ADDRESS';
    const provider = new Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const tokenContract = new Contract(tokenAddress, tokenABI, signer);

    const approveTx = await tokenContract.approve(contractAddress, parseUnits(totalBets.toString(), 18));
    await approveTx.wait();

    // Call the contract function
    const contractABI = [
      "function setAnswer(int8[5] memory _answersArray, int8[5] memory _bets) public"
    ];
    const contract = new Contract(contractAddress, contractABI, signer);
    const tx = await contract.setAnswer(answers.map(a => parseInt(a, 10)), bets.map(b => parseInt(b, 10)));
    await tx.wait();

    alert('Quiz submitted successfully!');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Quiz</h1>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} style={{ marginBottom: '10px' }}>
          <h4>Question {index + 1}</h4>
          <div>
            <label>
              <input
                type="radio"
                value={1}
                checked={answers[index] === 1}
                onChange={() => handleAnswerChange(index, 1)}
              />
              Option 1
            </label>
            <label>
              <input
                type="radio"
                value={2}
                checked={answers[index] === 2}
                onChange={() => handleAnswerChange(index, 2)}
              />
              Option 2
            </label>
            <label>
              <input
                type="radio"
                value={3}
                checked={answers[index] === 3}
                onChange={() => handleAnswerChange(index, 3)}
              />
              Option 3
            </label>
          </div>
          <div>
            <label>
              Bet (0-5 Tokens):
              <input
                type="number"
                value={bets[index]}
                onChange={(e) => handleBetChange(index, e.target.value)}
                min="0"
                max="5"
              />
            </label>
          </div>
        </div>
      ))}
      <button onClick={handleFinish}>Finish</button>
    </div>
  );
};

export default Quiz;
