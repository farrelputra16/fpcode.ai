// layout.tsx
import "./globals.css";
import Image from "next/image";
import { Orbitron } from "next/font/google";

const orbitron = Orbitron({ subsets: ["latin"], weight: ["500", "700"] });

export const metadata = {
  title: "fpcode.ai",
  description: "Your AI Copilot",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`bg-[#202123] text-white min-h-screen ${orbitron.className}`}>
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div className="text-2xl font-bold flex items-center gap-3">
            <Image src="/fpcode.png" alt="fpcode.ai" width={40} height={40} />
            <span className="tracking-wide text-[#dfbfc9]">fpcode.ai</span>
          </div>
        </header>

        <main className="flex-grow">{children}</main>

        <footer className="text-xs text-gray-500 text-center py-2">
          © 2025 farrel putra
        </footer>
      </body>
    </html>
  );
}
