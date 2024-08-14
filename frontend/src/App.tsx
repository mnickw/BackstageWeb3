import './App.css'

import React, { useState } from 'react';
import InitScreen from './InitScreen';
import CheckBalanceScreen from './CheckBalanceScreen';
import QuestionScreen from './QuestionScreen';

const questions = [
  {
    questionText: "What is the capital of France?",
    options: ["Berlin", "London", "Paris"]
  },
  {
    questionText: "Which is the smallest planet in our solar system?",
    options: ["Earth", "Mercury", "Mars"]
  },
  
];

const App: React.FC = () => {
  const [walletId, setWalletId] = useState<string | null>(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);

  const handleQuizStart = () => {
    setQuizStarted(true);
  };

  const handleQuizFinish = (results: number[]) => {
    console.log("Quiz Results: ", results);
    setQuizFinished(true);
  };

  return (
    <div>
      {!walletId ? (
        <InitScreen onWalletConnected={(id: string) => setWalletId(id)} />
      ) : !quizStarted ? (
        <div>
          <CheckBalanceScreen walletId={walletId} />
          <button onClick={handleQuizStart}>Start Quiz</button>
        </div>
      ) : !quizFinished ? (
        <QuestionScreen questions={questions} onFinish={handleQuizFinish} />
      ) : (
        <div>
          <h2>Thank you for completing the quiz!</h2>
          {/* Afișează rezultatele finale */}
        </div>
      )}
    </div>
  );
}

export default App;
