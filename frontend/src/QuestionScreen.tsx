import React, { useState } from 'react';

interface Question {
  questionText: string;
  options: string[];
}

interface QuestionScreenProps {
  questions: Question[];
  onFinish: (results: number[]) => void;
}

const QuestionScreen: React.FC<QuestionScreenProps> = ({ questions, onFinish }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>(new Array(questions.length).fill(-1));
  const [tokensBet, setTokensBet] = useState<number[]>(new Array(questions.length).fill(0));

  const handleAnswerSelect = (answerIndex: number) => {
    const updatedAnswers = [...selectedAnswers];
    updatedAnswers[currentQuestionIndex] = answerIndex;
    setSelectedAnswers(updatedAnswers);
  };

  const handleTokenBet = (bet: number) => {
    const updatedBets = [...tokensBet];
    updatedBets[currentQuestionIndex] = bet;
    setTokensBet(updatedBets);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleFinish = () => {
    onFinish(selectedAnswers);
  };

  return (
    <div>
      <h2>Question {currentQuestionIndex + 1} of {questions.length}</h2>
      <p>{questions[currentQuestionIndex].questionText}</p>
      <div>
        {questions[currentQuestionIndex].options.map((option, index) => (
          <div key={index}>
            <input
              type="radio"
              value={index}
              checked={selectedAnswers[currentQuestionIndex] === index}
              onChange={() => handleAnswerSelect(index)}
            />
            {option}
          </div>
        ))}
      </div>
      <div>
        <label>
          Tokens Bet:
          <input
            type="number"
            value={tokensBet[currentQuestionIndex]}
            onChange={(e) => handleTokenBet(parseInt(e.target.value))}
            min="0"
            max="5"
          />
        </label>
      </div>
      <button onClick={handleNext} disabled={currentQuestionIndex >= questions.length - 1}>
        Next
      </button>
      <button onClick={handleFinish}>
        Finish
      </button>
    </div>
  );
}

export default QuestionScreen;
