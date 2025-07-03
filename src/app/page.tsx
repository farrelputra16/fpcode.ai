// page.tsx
'use client';

import ChatBox from "@/components/ChatBox";
import { useState } from "react";
import { FaSun, FaMoon, FaWallet, FaChevronDown, FaCrown } from "react-icons/fa";
import Image from "next/image";
import { Orbitron } from "next/font/google";

import { useSolanaWallet } from "@/lib/wallet";
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { WalletDisconnectButton } from '@solana/wallet-adapter-react-ui';
import { solanaNetwork } from "@/components/SolanaProviders";

import PremiumModal from "@/components/PremiumModal";
import FuturisticBackground from "@/components/FuturisticBackground"; // Import 3D background component

const orbitron = Orbitron({ subsets: ["latin"], weight: ["500", "700"] });

export default function Home() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);

  const { publicKey: solanaPublicKey, connected: isSolanaConnected } = useSolanaWallet();
  const { setVisible: setSolanaModalVisible } = useWalletModal();

  const activeUserAddress = isSolanaConnected && solanaPublicKey ? solanaPublicKey.toBase58() : undefined;
  const activeChain = isSolanaConnected ? `Solana (${solanaNetwork})` : 'None';

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "dark" ? "light" : "dark"));
  };

  const primaryBgClass = theme === "dark"
    ? "bg-gradient-to-br from-black via-gray-950 to-gray-900"
    : "bg-gradient-to-br from-gray-50 via-white to-gray-100";
  const textColor = theme === "dark" ? "text-gray-100" : "text-gray-900";
  const mutedTextColor = theme === "dark" ? "text-gray-400" : "text-gray-600";
  const accentColor = theme === "dark" ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-500 hover:bg-blue-600";
  const borderColor = theme === "dark" ? "border-gray-800" : "border-gray-200";

  // Header will have neon shadow in dark mode
  const headerBgColor = theme === "dark" ? "bg-gray-950" : "bg-white";
  const headerBorderColor = theme === "dark" ? "border-gray-800" : "border-gray-200";
  const headerShadowClass = theme === "dark" ? "shadow-neon-md" : "shadow-md"; // Apply neon shadow here
  
  const fpcodeAiTextColor = theme === "dark" ? "text-blue-400" : "text-gray-900";

  const walletButtonBaseColor = theme === "dark"
    ? "bg-gray-800 text-white hover:bg-gray-700"
    : "bg-gray-100 text-gray-800 hover:bg-gray-200";

  // Premium button color - now matches wallet button in light mode
  const premiumButtonColor = theme === "dark"
    ? accentColor
    : walletButtonBaseColor;

  return (
    <div className={`min-h-screen flex flex-col ${primaryBgClass} ${textColor} relative`}> {/* Added relative for Z-index */}
      {/* 3D Futuristic Background Component */}
      <FuturisticBackground theme={theme} />

      <header className={`relative z-10 flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b ${headerBorderColor} ${headerBgColor} ${headerShadowClass}`}> {/* Apply neon shadow class */}
        <div className="text-xl md:text-2xl font-bold flex items-center gap-3">
          <Image src="/fpcode.png" alt="fpcode.ai" width={50} height={50} className="md:w-12 md:h-12" />
          <span className={`tracking-wide ${fpcodeAiTextColor} ${orbitron.className}`}>fpcode.ai</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Premium Button */}
          <button
            onClick={() => setIsPremiumModalOpen(true)}
            className={`${premiumButtonColor} px-4 py-2 rounded-full transition-colors duration-200 flex items-center gap-2 text-sm md:text-base`}
            title="Get Premium Features"
          >
            <FaCrown className="text-xl" />
            Premium
          </button>

          {/* Unified Wallet Connect/Disconnect Button */}
          <div className="relative">
            {isSolanaConnected ? (
              <button
                onClick={() => setShowWalletDropdown(!showWalletDropdown)}
                className={`${walletButtonBaseColor} px-4 py-2 rounded-full transition-colors duration-200 flex items-center gap-2`}
                aria-label="Solana Wallet Options"
              >
                <FaWallet className="text-xl" />
                <span className="hidden sm:inline">
                  {solanaPublicKey?.toBase58().substring(0, 4)}...{solanaPublicKey?.toBase58().substring(solanaPublicKey?.toBase58().length - 4)}
                </span>
                <FaChevronDown className={`ml-1 transition-transform ${showWalletDropdown ? 'rotate-180' : 'rotate-0'}`} />
              </button>
            ) : (
              <button
                onClick={() => setSolanaModalVisible(true)}
                className={`${walletButtonBaseColor} px-4 py-2 rounded-full transition-colors duration-200`}
              >
                Connect Wallet
              </button>
            )}

            {isSolanaConnected && showWalletDropdown && (
              <div className={`absolute right-0 mt-2 w-48 ${theme === "dark" ? "bg-gray-900" : "bg-white"} border ${borderColor} rounded-md shadow-lg z-10`}>
                <WalletDisconnectButton className={`w-full text-left px-4 py-2 rounded-md ${walletButtonBaseColor} !p-2 !rounded-md !bg-none !shadow-none !border-none !text-base !normal-case !font-normal !inline-flex !items-center !justify-start`} />
              </div>
            )}
          </div>

          <button
            onClick={toggleTheme}
            className={`p-2 rounded-full transition-colors duration-200 ${
              theme === "dark" ? "bg-gray-800 text-white hover:bg-gray-700" : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <FaSun className="text-xl" /> : <FaMoon className="text-xl" />}
          </button>
        </div>
      </header>

      <main className="relative z-10 flex-grow flex justify-center items-center py-4 md:py-8 px-4 sm:px-6 lg:px-8"> {/* Added relative z-10 */}
        <div className="w-full max-w-5xl h-[calc(100vh-160px)] flex flex-col">
          <section className="flex-grow flex flex-col min-h-0">
            <ChatBox theme={theme} userAddress={activeUserAddress} activeChain={activeChain} />
          </section>
        </div>
      </main>

      <footer className={`relative z-10 text-xs text-center py-2 ${mutedTextColor}`}> {/* Added relative z-10 */}
        © 2025 Farrel Putra
      </footer>

      {/* Render the PremiumModal */}
      <PremiumModal
        isOpen={isPremiumModalOpen}
        onClose={() => setIsPremiumModalOpen(false)}
        theme={theme}
      />
    </div>
  );
}