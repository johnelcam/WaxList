"use client";

import Link from "next/link";
import Logo from "./Logo";
import { ARCSCAN, switchToArc } from "@/lib/arcNetwork";

interface HeaderProps {
  account: string;
  balance: string;
  chainOk: boolean;
  connecting: boolean;
  onConnect: () => void;
}

export default function Header({ account, balance, chainOk, connecting, onConnect }: HeaderProps) {
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
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <Logo size={22} />
          <span className="display" style={{ fontSize: 22, color: "var(--pale)", letterSpacing: "-0.04em" }}>
            waxlist
          </span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {account ? (
            <>
              {!chainOk && (
                <button onClick={() => switchToArc().catch(() => {})} className="btn" style={{ color: "#e58b6b", fontSize: 13, padding: "7px 14px" }}>
                  Switch to ARC
                </button>
              )}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 9,
                  border: "1px solid var(--line-dark)",
                  borderRadius: 999,
                  padding: "7px 14px",
                  fontSize: 13.5,
                  fontWeight: 600,
                }}
              >
                <span style={{ color: "var(--pale)" }}>{balance || "0"}</span>
                <span style={{ color: "var(--muted-dark)" }}>USDC</span>
                <span style={{ width: 1, height: 13, background: "var(--line-dark)" }} />
                <a href={`${ARCSCAN}/address/${account}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "var(--muted-dark)" }}>
                  {account.slice(0, 6)}…{account.slice(-4)}
                </a>
              </span>
            </>
          ) : (
            <button onClick={onConnect} disabled={connecting} className="pill pill--orange">
              {connecting ? "Connecting…" : "Connect wallet"}
              <span className="knob">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
