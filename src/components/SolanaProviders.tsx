// src/components/SolanaProviders.tsx
'use client';

import React, { useMemo } from 'react';
import {
  WalletProvider,
  ConnectionProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

// --- PERUBAHAN DI SINI: Kembali ke Devnet dan gunakan URL Devnet Helius Anda ---
export const solanaNetwork = WalletAdapterNetwork.Mainnet;
// Ganti dengan URL RPC DEVNET Helius Anda (contoh):
export const solanaEndpoint = "https://devnet.helius-rpc.com/?api-key=4c390f8d-2cb6-4c5b-ad51-b614c62aa8b6"; // Sesuaikan dengan API Key Anda

export const solanaWallets = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
];

interface SolanaProvidersProps {
  children: React.ReactNode;
}

export function SolanaProviders({ children }: SolanaProvidersProps) {
  const wallets = useMemo(() => solanaWallets, []);

  return (
    <ConnectionProvider endpoint={solanaEndpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}