"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "./Logo";
import { ARCSCAN, switchToArc } from "@/lib/arcNetwork";

interface HeaderProps {
  account: string;
  balance: string;
  chainOk: boolean;
  connecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export default function Header({ account, balance, chainOk, connecting, onConnect, onDisconnect }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(account);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(24,26,11,0.78)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--line-dark)",
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "14px 26px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none" }}>
          <Logo size={22} />
          <span className="wordmark" style={{ fontSize: 23, color: "var(--pale)" }}>
            waxl<span className="wm-i">i</span>st
          </span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {account ? (
            <>
              {!chainOk && (
                <button onClick={() => switchToArc().catch(() => {})} style={{ background: "none", border: "1px solid #6a4030", color: "#e58b6b", borderRadius: 999, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  Wrong network — switch
                </button>
              )}

              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setOpen((o) => !o)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 9,
                    background: open ? "var(--dark-3)" : "transparent",
                    border: "1px solid var(--line-dark)",
                    borderRadius: 999,
                    padding: "7px 12px",
                    fontSize: 13.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    color: "var(--cream)",
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: 99, background: chainOk ? "#7cc04a" : "#e0a13a", flexShrink: 0 }} />
                  <span style={{ color: "var(--pale)" }}>{balance || "0"}</span>
                  <span style={{ color: "var(--muted-dark)" }}>USDC</span>
                  <span style={{ width: 1, height: 13, background: "var(--line-dark)" }} />
                  <span style={{ color: "var(--muted-dark)" }}>{account.slice(0, 6)}…{account.slice(-4)}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s ease", opacity: 0.7 }}>
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {open && (
                  <>
                    <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 60 }} />
                    <div
                      style={{
                        position: "absolute",
                        top: "calc(100% + 8px)",
                        right: 0,
                        zIndex: 61,
                        minWidth: 210,
                        background: "var(--dark-2)",
                        border: "1px solid var(--line-dark)",
                        borderRadius: 14,
                        padding: 6,
                        boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
                      }}
                    >
                      <div style={{ padding: "8px 12px 10px", borderBottom: "1px solid var(--line-dark)", marginBottom: 4 }}>
                        <div style={{ fontSize: 11, color: "var(--faint)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 3 }}>Connected</div>
                        <div style={{ fontSize: 13, color: "var(--cream)", fontFamily: "ui-monospace, monospace" }}>{account.slice(0, 12)}…{account.slice(-8)}</div>
                      </div>
                      <button className="wax-opt" onClick={copy}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M5 15V5a2 2 0 012-2h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                        {copied ? "Copied!" : "Copy address"}
                      </button>
                      <a className="wax-opt" href={`${ARCSCAN}/address/${account}`} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M14 4h6v6M20 4l-9 9M19 13v6a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        View on ArcScan
                      </a>
                      <button className="wax-opt danger" onClick={() => { setOpen(false); onDisconnect(); }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M15 12H4m0 0l4-4m-4 4l4 4M9 4h8a2 2 0 012 2v12a2 2 0 01-2 2H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        Disconnect
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            (() => {
              const label = connecting ? "Plugging in…" : "Plug in wallet";
              return (
                <button onClick={onConnect} disabled={connecting} className="pill pill--orange">
                  {label}
                  <span className="knob">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                </button>
              );
            })()
          )}
        </div>
      </div>
    </header>
  );
}
