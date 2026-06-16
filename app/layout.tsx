import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WaxList — the autonomous collectible machine on ARC",
  description:
    "Insert a quarter of USDC, the machine mints you a random collectible card on-chain. No shopkeeper — the contract is the merchant. Agentic commerce, powered by ARC's native USDC micro-payments.",
  keywords: "WaxList, ARC, USDC, NFT, collectibles, gacha, agentic commerce, micropayments, web3",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
