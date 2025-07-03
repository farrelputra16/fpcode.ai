// layout.tsx (CORRECTED VERSION)
import "./globals.css";
import { Inter } from "next/font/google";

// Import the SolanaProviders client component directly
import { SolanaProviders } from '@/components/SolanaProviders'; // Correct import path
import '@solana/wallet-adapter-react-ui/styles.css'; // Keep the styles import

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "fpcode.ai",
  description: "Your AI Copilot",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`min-h-screen ${inter.className}`}>
        {/* Simply render the SolanaProviders client component */}
        <SolanaProviders>
          {children}
        </SolanaProviders>
      </body>
    </html>
  );
}