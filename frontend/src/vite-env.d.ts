/// <reference types="vite/client" />
declare global {
  interface Ethereum {
    request<T = any>(args: { method: string; params?: unknown[] | object }): Promise<T>;
  }

  interface Window {
    ethereum: Ethereum;
  }
}