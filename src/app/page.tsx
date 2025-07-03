// page.tsx
'use client';

import ChatBox from "@/components/ChatBox";
import { useState, useEffect } from "react";
import { FaSun, FaMoon, FaWallet, FaChevronDown, FaCrown } from "react-icons/fa";
import Image from "next/image";
import { Orbitron } from "next/font/google";

import { useSolanaWallet } from "@/lib/wallet";
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { WalletDisconnectButton } from '@solana/wallet-adapter-react-ui';
import { solanaNetwork } from "@/components/SolanaProviders";

import PremiumModal from "@/components/PremiumModal";
import FuturisticBackground from "@/components/FuturisticBackground";

const orbitron = Orbitron({ subsets: ["latin"], weight: ["500", "700"] });

export default function Home() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = (event.clientY / window.innerHeight) * 2 - 1;
      setMousePosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

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

  const headerBgColor = theme === "dark" ? "bg-gray-950" : "bg-white";
  const headerBorderColor = theme === "dark" ? "border-gray-800" : "border-gray-200";
  const headerShadowClass = theme === "dark" ? "shadow-neon-md" : "shadow-md";
  
  const fpcodeAiTextColor = theme === "dark" ? "text-blue-400" : "text-gray-900";

  const walletButtonBaseColor = theme === "dark"
    ? "bg-gray-800 text-white hover:bg-gray-700"
    : "bg-gray-100 text-gray-800 hover:bg-gray-200";

  const premiumButtonColor = theme === "dark"
    ? accentColor
    : walletButtonBaseColor;

  return (
    <div className={`min-h-screen flex flex-col ${primaryBgClass} ${textColor} relative`}>
      {/* 3D Futuristic Background Component - will cover the entire page */}
      <FuturisticBackground theme={theme} mousePosition={mousePosition} />

      <header className={`relative z-10 flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b ${headerBorderColor} ${headerBgColor} ${headerShadowClass}`}>
        <div className="text-xl md:text-2xl font-bold flex items-center gap-3">
          <Image src="/fpcode.png" alt="fpcode.ai" width={50} height={50} className="md:w-12 md:h-12" />
          <span className={`tracking-wide ${fpcodeAiTextColor} ${orbitron.className}`}>fpcode.ai</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Responsive Premium Button */}
          <button
            onClick={() => setIsPremiumModalOpen(true)}
            className={`${premiumButtonColor} px-3 py-2 rounded-full transition-colors duration-200 flex items-center gap-2 text-sm md:text-base`}
            title="Get Premium Features"
          >
            <FaCrown className="text-xl sm:text-base" /> {/* Icon always visible */}
            <span className="hidden sm:inline">Premium</span> {/* Text hidden on small screens */}
          </button>

          {/* Unified Responsive Wallet Connect/Disconnect Button */}
          <div className="relative">
            {isSolanaConnected ? (
              <button
                onClick={() => setShowWalletDropdown(!showWalletDropdown)}
                className={`${walletButtonBaseColor} px-3 py-2 rounded-full transition-colors duration-200 flex items-center gap-2 text-sm md:text-base`}
                aria-label="Solana Wallet Options"
              >
                <FaWallet className="text-xl sm:text-base" /> {/* Icon always visible */}
                <span className="hidden sm:inline"> {/* Truncated key hidden on small screens */}
                  {solanaPublicKey?.toBase58().substring(0, 4)}...{solanaPublicKey?.toBase58().substring(solanaPublicKey?.toBase58().length - 4)}
                </span>
                <FaChevronDown className={`ml-1 hidden sm:inline transition-transform ${showWalletDropdown ? 'rotate-180' : 'rotate-0'}`} /> {/* Arrow hidden on small screens */}
              </button>
            ) : (
              <button
                onClick={() => setSolanaModalVisible(true)}
                className={`${walletButtonBaseColor} px-3 py-2 rounded-full transition-colors duration-200 flex items-center gap-2 text-sm md:text-base`}
              >
                <FaWallet className="text-xl sm:text-base" /> {/* Icon always visible */}
                <span className="hidden sm:inline">Connect Wallet</span> {/* Text hidden on small screens */}
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

      {/* Main content area */}
      <main className="relative z-10 flex-grow flex justify-center items-stretch py-4 md:py-8 px-4 sm:px-6 lg:px-8 bg-transparent">
        <div className="w-full max-w-5xl h-[calc(100vh-160px)] flex flex-col">
          <section className="flex-grow flex flex-col min-h-0">
            <ChatBox theme={theme} userAddress={activeUserAddress} activeChain={activeChain} isBackgroundTransparent={true} />
          </section>
        </div>
      </main>

      <footer className={`relative z-10 text-xs text-center py-2 ${mutedTextColor}`}>
        © 2025 Farrel Putra
      </footer>

      <PremiumModal
        isOpen={isPremiumModalOpen}
        onClose={() => setIsPremiumModalOpen(false)}
        theme={theme}
      />
    </div>
  );
}