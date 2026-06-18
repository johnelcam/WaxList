"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { ARC_RPC, ARC_CHAIN_HEX, switchToArc } from "./arcNetwork";
import { ensureDiscovered, pickProvider, pickDetail, setChosenRdns } from "./wallet";

const DISCONNECT_KEY = "waxlist.disconnected";

/**
 * Single source of truth for wallet state. Discovers wallets via EIP-6963
 * (Rabby first), pins the chosen one, and uses that same provider for reads,
 * writes and events. Supports an explicit disconnect that survives reloads
 * (the wallet stays "forgotten" until the user connects again).
 */
export function useWallet() {
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState("");
  const [chainOk, setChainOk] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const disconnectedRef = useRef(false);

  const refreshBalance = useCallback(async (addr: string) => {
    try {
      const p = new ethers.JsonRpcProvider(ARC_RPC);
      const b = await p.getBalance(addr);
      setBalance(parseFloat(ethers.formatEther(b)).toFixed(3));
    } catch {
      setBalance("—");
    }
  }, []);

  const connect = useCallback(async () => {
    disconnectedRef.current = false;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(DISCONNECT_KEY);
      } catch {
        /* ignore */
      }
    }
    await ensureDiscovered();
    const detail = pickDetail();
    const inj = detail?.provider;
    if (!inj) return;
    setChosenRdns(detail.rdns);
    setConnecting(true);
    try {
      const accs = (await inj.request({ method: "eth_requestAccounts" })) as string[];
      if (!accs?.length) return;
      setAccount(accs[0]);
      await switchToArc(inj);
      try {
        const id = (await inj.request({ method: "eth_chainId" })) as string;
        setChainOk(id.toLowerCase() === ARC_CHAIN_HEX.toLowerCase());
      } catch {
        setChainOk(false);
      }
      refreshBalance(accs[0]);
    } catch {
      /* user rejected */
    } finally {
      setConnecting(false);
    }
  }, [refreshBalance]);

  const disconnect = useCallback(() => {
    disconnectedRef.current = true;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(DISCONNECT_KEY, "1");
      } catch {
        /* ignore */
      }
    }
    setAccount("");
    setBalance("");
    setChainOk(false);
  }, []);

  useEffect(() => {
    let cleanup = () => {};
    if (typeof window !== "undefined" && window.localStorage.getItem(DISCONNECT_KEY) === "1") {
      disconnectedRef.current = true;
    }
    (async () => {
      await ensureDiscovered();
      const inj = pickProvider();
      if (!inj) return;
      if (!disconnectedRef.current) {
        try {
          const accs = (await inj.request({ method: "eth_accounts" })) as string[];
          if (accs.length) {
            setAccount(accs[0]);
            refreshBalance(accs[0]);
            inj
              .request({ method: "eth_chainId" })
              .then((id) => setChainOk((id as string).toLowerCase() === ARC_CHAIN_HEX.toLowerCase()))
              .catch(() => {});
          }
        } catch {
          /* ignore */
        }
      }
      if (!inj.on) return;
      const onAcc = (a: unknown) => {
        if (disconnectedRef.current) return; // stay forgotten until reconnect
        const list = a as string[];
        if (list.length) {
          setAccount(list[0]);
          refreshBalance(list[0]);
        } else {
          setAccount("");
          setBalance("");
          setChainOk(false);
        }
      };
      const onChain = (c: unknown) =>
        setChainOk((c as string).toLowerCase() === ARC_CHAIN_HEX.toLowerCase());
      inj.on("accountsChanged", onAcc);
      inj.on("chainChanged", onChain);
      cleanup = () => {
        inj.removeListener?.("accountsChanged", onAcc);
        inj.removeListener?.("chainChanged", onChain);
      };
    })();
    return () => cleanup();
  }, [refreshBalance]);

  return { account, balance, chainOk, connecting, connect, disconnect, refreshBalance };
}
