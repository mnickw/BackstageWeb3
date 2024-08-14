import React, { useState } from 'react';

interface InitScreenProps {
  onWalletConnected: (walletId: string) => void;
}

declare global {
  interface Ethereum {
    request<T = any>(args: { method: string; params?: unknown[] | object }): Promise<T>;
  }

  interface Window {
    ethereum: Ethereum;
  }
}

const InitScreen: React.FC<InitScreenProps> = ({ onWalletConnected }) => {
  const [walletId, setWalletId] = useState<string | null>(null);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request<string[]>({ method: 'eth_requestAccounts' });
        const wallet = accounts[0];
        setWalletId(wallet);
        onWalletConnected(wallet);
      } catch (error) {
        console.error("Wallet connection failed", error);
      }
    } else {
      alert('Please install MetaMask!');
    }
  };

  return (
    <div>
      <h1 className='text-red-500 cursor-pointer'>Welcome to the Quiz App</h1>
      {!walletId ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <p>Wallet Connected: {walletId}</p>
      )}
    </div>
  );
}

export default InitScreen;
