// src/lib/wallet.ts (CLEANED UP VERSION)
// No need for React import here anymore.
// No need for Solana Wallet Adapter *component* imports here anymore.

import { useWallet } from '@solana/wallet-adapter-react';
// import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'; // No need to import if only using from SolanaProviders.tsx

// Export the hook for use in other client components (like page.tsx or ChatBox.tsx)
export { useWallet as useSolanaWallet };

// If you need solanaNetwork string for display in page.tsx,
// and you want it centralized, you can re-export it from SolanaProviders
// or directly define it in page.tsx if it's constant.
// For now, let's assume page.tsx will import it from SolanaProviders.
// (So, this file will be very minimal).

// If you truly need a global `solanaNetwork` constant from here,
// you would keep the import and export it:
// import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
// export const solanaNetwork = WalletAdapterNetwork.Mainnet;
// But the current approach for `page.tsx` is to get it from `SolanaProviders.tsx`
// so this file can be even simpler.