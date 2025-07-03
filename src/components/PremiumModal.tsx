// src/components/PremiumModal.tsx
'use client';

import React from 'react';
import { FaTimes, FaCoins } from 'react-icons/fa';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useSolanaWallet } from "@/lib/wallet";
import { useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
}

const MY_WALLET_ADDRESS = new PublicKey("DicktfHLMyC84Wib7Gs9ctR2FmfCY2KgQJYJgjWoWB6S");
const PREMIUM_PRICE_SOL = 0.0003;

export default function PremiumModal({ isOpen, onClose, theme }: PremiumModalProps) {
  const { publicKey, connected, sendTransaction } = useSolanaWallet();
  const { connection } = useConnection();
  const { setVisible: setSolanaModalVisible } = useWalletModal();

  if (!isOpen) return null;

  const handleConfirmAndPay = async () => {
    if (!connected || !publicKey) {
      alert("Please connect your Solana wallet first!");
      setSolanaModalVisible(true);
      return;
    }

    if (!connection) {
      alert("Solana connection not established. Please try again.");
      return;
      }

    const isConfirmed = window.confirm(
      `Are you sure you want to purchase Premium for ${PREMIUM_PRICE_SOL} SOL?`
    );
    if (!isConfirmed) {
      return;
    }

    try {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: MY_WALLET_ADDRESS,
          lamports: PREMIUM_PRICE_SOL * LAMPORTS_PER_SOL,
        })
      );

      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection);

      await connection.confirmTransaction(signature, 'confirmed');

      alert(`Premium purchase successful! Transaction ID: ${signature}\nYou can view it on Solana Devnet Explorer.`);
      onClose();
    } catch (error) {
      console.error("Failed to purchase Premium:", error);
      alert(`Failed to purchase Premium: ${error instanceof Error ? error.message : String(error)}. Make sure you have enough Devnet SOL.`);
    }
  };

  // --- REVISED THEME COLORS FOR MODAL ---
  const modalBgColor = theme === 'dark' ? 'bg-gray-900' : 'bg-white'; // Modal background
  const textColor = theme === 'dark' ? 'text-gray-100' : 'text-gray-900';
  const borderColor = theme === 'dark' ? 'border-gray-700' : 'border-gray-200';
  const accentButtonColor = theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'; // Accent button
  const buttonTextColor = 'text-white';
  const disabledButtonColor = 'bg-gray-700 text-gray-400 cursor-not-allowed'; // Muted for disabled button in dark mode
  const mutedTextColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-600'; // Muted text for lists/hints
  const highlightColor = theme === 'dark' ? 'text-blue-400' : 'text-blue-700'; // Highlight color for titles/prices

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`relative w-full max-w-md rounded-xl shadow-2xl p-6 ${modalBgColor} ${textColor} border ${borderColor} ${theme === 'dark' ? 'shadow-neon-lg' : ''}`}> {/* Added neon shadow here */}
        <button
          onClick={onClose}
          className={`absolute top-3 right-3 p-2 rounded-full ${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} ${textColor}`}
          aria-label="Close"
        >
          <FaTimes className="text-xl" />
        </button>

        <h2 className={`text-3xl font-bold mb-4 text-center ${highlightColor}`}>Unlock Premium</h2>
        <p className="text-center mb-6 text-lg">
          Elevate your experience with exclusive features!
        </p>

        <div className={`mb-6 p-4 rounded-xl border ${borderColor}`}>
          <div className="flex justify-between items-center text-xl font-semibold mb-2">
            <span>Premium Plan</span>
            <span className={`flex items-center gap-1 ${highlightColor}`}>
              {PREMIUM_PRICE_SOL} <FaCoins className="text-xl" /> SOL
            </span>
          </div>
          <ul className={`text-md mt-2 list-disc list-inside ${mutedTextColor}`}>
            <li>Access advanced AI models</li>
            <li>Priority new feature rollouts</li>
            <li>Enjoy an ad-free environment</li>
            <li>Dedicated community support</li>
          </ul>
        </div>

        <button
          onClick={handleConfirmAndPay}
          disabled={!connected}
          className={`w-full py-3 rounded-xl text-lg font-semibold transition-colors duration-200 ${
            connected ? accentButtonColor : disabledButtonColor
          } ${buttonTextColor}`}
        >
          {connected ? `Confirm & Pay ${PREMIUM_PRICE_SOL} SOL` : 'Connect Wallet to Pay'}
        </button>
        {!connected && (
          <p className={`text-center text-sm mt-2 ${mutedTextColor}`}>
            Please connect your wallet to proceed with the payment.
          </p>
        )}
      </div>
    </div>
  );
}