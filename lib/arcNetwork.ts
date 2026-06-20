import { pickProvider, type Eip1193Provider } from "./wallet";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

// ---- ARC Testnet chain configuration ----
export const ARC_CHAIN_ID = 5042002;
export const ARC_RPC = "https://rpc.testnet.arc.network";
export const ARCSCAN = "https://testnet.arcscan.app";

// Hex form of the chain id, the shape wallets expect in RPC params.
export const ARC_CHAIN_HEX = "0x" + ARC_CHAIN_ID.toString(16);

export const ARC_NETWORK_PARAMS = {
  chainId: ARC_CHAIN_HEX,
  chainName: "ARC Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: [ARC_RPC],
  blockExplorerUrls: [ARCSCAN],
};

/**
 * Adds ARC Testnet to the wallet (when missing) and then switches to it.
 * Acts on the given provider, or otherwise the best discovered one (Rabby first).
 */
export async function switchToArc(provider?: Eip1193Provider): Promise<void> {
  const eth = provider ?? pickProvider();
  if (!eth) throw new Error("No wallet detected");

  // Registering the chain is harmless if it is already known to the wallet.
  try {
    await eth.request({
      method: "wallet_addEthereumChain",
      params: [ARC_NETWORK_PARAMS],
    });
  } catch {
    // Some wallets throw when the chain already exists — ignore.
  }

  // Now force the active network over to ARC.
  await eth.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: ARC_CHAIN_HEX }],
  });
}
