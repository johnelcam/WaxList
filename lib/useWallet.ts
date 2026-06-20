"use client";

import { ethers } from "ethers";
import { useCallback, useEffect, useRef, useState } from "react";
import { ensureDiscovered, pickDetail, pickProvider, setChosenRdns } from "./wallet";
import { ARC_CHAIN_HEX, ARC_RPC, switchToArc } from "./arcNetwork";

// Persisted flag marking that the user explicitly disconnected. Composed from
// the same namespace/slug scheme used for the rest of the app's stored state.
const FLAG_NS = "wl";
const explicitDisconnectFlag = `${FLAG_NS}/state/disconnected`;
const FLAG_ON = "1";

/**
 * The one place wallet state lives. Wallets are found through EIP-6963 (Rabby
 * preferred), the picked one is pinned, and that exact provider drives reads,
 * writes and events. A manual disconnect is remembered across reloads — the
 * wallet stays "forgotten" until the user connects again on purpose.
 */
export function useWallet() {
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState("");
  const [chainOk, setChainOk] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const forgottenRef = useRef(false);

  const refreshBalance = useCallback(async (addr: string) => {
    try {
      const rpc = new ethers.JsonRpcProvider(ARC_RPC);
      const wei = await rpc.getBalance(addr);
      setBalance(parseFloat(ethers.formatEther(wei)).toFixed(3));
    } catch {
      setBalance("—");
    }
  }, []);

  const disconnect = useCallback(() => {
    forgottenRef.current = true;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(explicitDisconnectFlag, FLAG_ON);
      } catch {
        /* ignore */
      }
    }
    setAccount("");
    setBalance("");
    setChainOk(false);
  }, []);

  const connect = useCallback(async () => {
    forgottenRef.current = false;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(explicitDisconnectFlag);
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

  useEffect(() => {
    let cleanup = () => {};
    if (typeof window !== "undefined" && window.localStorage.getItem(explicitDisconnectFlag) === FLAG_ON) {
      forgottenRef.current = true;
    }
    (async () => {
      await ensureDiscovered();
      const inj = pickProvider();
      if (!inj) return;
      if (!forgottenRef.current) {
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
        if (forgottenRef.current) return; // stay forgotten until reconnect
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
