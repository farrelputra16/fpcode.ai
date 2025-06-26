'use client';

import ChatBox from "@/components/ChatBox";
import { useState } from "react";
import { FaSun, FaMoon } from "react-icons/fa";
import Image from "next/image";
import { Orbitron } from "next/font/google";

const orbitron = Orbitron({ subsets: ["latin"], weight: ["500", "700"] });

export default function Home() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "dark" ? "light" : "dark"));
  };

  const backgroundColor = theme === "dark" ? "bg-gray-900" : "bg-gray-50";
  const textColor = theme === "dark" ? "text-white" : "text-gray-900";
  const headerBgColor = theme === "dark" ? "bg-gray-800" : "bg-white";
  const headerBorderColor = theme === "dark" ? "border-gray-700" : "border-gray-200";

  // Determine text color based on the current theme
  const fpcodeAiTextColor = theme === "dark" ? "text-gray-100" : "text-gray-900";

  return (
    <div className={`min-h-screen flex flex-col ${backgroundColor} ${textColor}`}>
      <header className={`flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b ${headerBorderColor} ${headerBgColor} shadow-sm`}>
        <div className="text-xl md:text-2xl font-bold flex items-center gap-3">
          <Image src="/fpcode.png" alt="fpcode.ai" width={50} height={50} className="md:w-12 md:h-12" />
          <span className={`tracking-wide ${fpcodeAiTextColor} ${orbitron.className}`}>fpcode.ai</span>
        </div>
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-full transition-colors duration-200 ${
            theme === "dark" ? "bg-gray-700 text-white hover:bg-gray-600" : "bg-gray-200 text-gray-800 hover:bg-gray-300"
          }`}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <FaSun className="text-xl" /> : <FaMoon className="text-xl" />}
        </button>
      </header>

      <main className="flex-grow flex justify-center items-center py-4 md:py-8 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-5xl h-[calc(100vh-160px)] flex flex-col">
          <section className="flex-grow flex flex-col min-h-0">
            <ChatBox theme={theme} />
</section>
        </div>
      </main>

      <footer className={`text-xs text-center py-2 ${theme === "dark" ? "text-gray-500" : "text-gray-600"}`}>
        © 2025 farrel putra
      </footer>
    </div>
  );
}