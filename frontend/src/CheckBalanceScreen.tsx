import React, { useEffect, useState } from 'react';

interface CheckBalanceScreenProps {
  walletId: string;
}

interface Balance {
  tokens: number;
  eth: number;
}

const CheckBalanceScreen: React.FC<CheckBalanceScreenProps> = ({ walletId }) => {
  const [balance, setBalance] = useState<Balance>({ tokens: 0, eth: 0 });

  const fetchBalance = async () => {
    
    setBalance({ tokens: 100, eth: 0.5 });
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  return (
    <div>
      <h2>Check Your Balance</h2>
      <p>Wallet ID: {walletId}</p>
      <p>Game Tokens: {balance.tokens}</p>
      <p>ETH: {balance.eth}</p>
      <div style={{gap: '10px', display: 'flex', justifyContent: 'center'}}>
        <button >Ask for Game Tokens and ETH</button>
        {/* <button>Start Quiz</button> */}
      </div>
    </div>
  );
}

export default CheckBalanceScreen;
