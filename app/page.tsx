"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import Header from "@/components/Header";
import CardTile from "@/components/CardTile";
import { useWallet } from "@/lib/useWallet";
import { ARCSCAN, switchToArc } from "@/lib/arcNetwork";
import { pickProvider } from "@/lib/wallet";
import {
  CONTRACT_ADDRESS,
  WAXLIST_ABI,
  RARITIES,
  readContract,
  fetchMachine,
  fetchRecent,
  fetchCollection,
  fmtUsdc,
  shortAddr,
  type Card,
  type Machine,
} from "@/lib/waxlist";

const Arrow = () => (
  <span className="knob">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
  </span>
);

export default function Home() {
  const { account, balance, chainOk, connecting, connect, disconnect, refreshBalance } = useWallet();

  const [machine, setMachine] = useState<Machine>({ pullPrice: 0n, cards: 0n, revenue: 0n, owner: "" });
  const [recent, setRecent] = useState<Card[]>([]);
  const [collection, setCollection] = useState<Card[]>([]);

  const [pulling, setPulling] = useState(false);
  const [pullMsg, setPullMsg] = useState("");
  const [revealed, setRevealed] = useState<Card | null>(null);

  const load = useCallback(async () => {
    try {
      const c = readContract();
      const [m, r] = await Promise.all([fetchMachine(c), fetchRecent(18, c)]);
      setMachine(m);
      setRecent(r);
      if (account) setCollection(await fetchCollection(account, c));
      else setCollection([]);
    } catch {
      /* keep last good state */
    }
  }, [account]);

  useEffect(() => {
    load();
  }, [load]);

  async function pull() {
    if (!account) {
      if (!pickProvider()) {
        setPullMsg("✗ No wallet detected — install Rabby or MetaMask");
        return;
      }
      connect();
      return;
    }
    if (machine.pullPrice === 0n) {
      setPullMsg("Machine is still loading — try again in a moment");
      return;
    }
    setPulling(true);
    setRevealed(null);
    setPullMsg("Insert coin… confirm in your wallet");
    try {
      const inj = pickProvider();
      if (!inj) throw new Error("No wallet found");
      await switchToArc(inj);
      const provider = new ethers.BrowserProvider(inj);
      const signer = await provider.getSigner(account);
      const c = new ethers.Contract(CONTRACT_ADDRESS, WAXLIST_ABI, signer);
      setPullMsg("The machine is rolling…");
      const tx = await c.pull({ value: machine.pullPrice });
      const receipt = await tx.wait();
      // Build the revealed card straight from the receipt event — no second
      // read, so it can't race the public RPC lagging the just-mined block.
      let card: Card | null = null;
      for (const log of receipt.logs) {
        try {
          const p = c.interface.parseLog(log);
          if (p && p.name === "Pulled") {
            card = {
              id: Number(p.args.id),
              owner: p.args.owner as string,
              item: Number(p.args.item),
              rarity: Number(p.args.rarity),
              mintedAt: Math.floor(Date.now() / 1000),
              pricePaid: p.args.price as bigint,
            };
            break;
          }
        } catch {
          /* not our event */
        }
      }
      setRevealed(card);
      setPullMsg(card ? "" : "✓ Card minted — check Your shelf");
      await load();
      if (account) await refreshBalance(account);
    } catch (e) {
      const err = e as { code?: string | number; message?: string };
      console.error(err);
      let msg = "Pull failed — try again";
      if (err?.code === "ACTION_REJECTED" || err?.code === 4001) msg = "Pull cancelled";
      else if (/insufficient funds/i.test(err?.message || "")) msg = "Not enough USDC for the pull + gas";
      setPullMsg("✗ " + msg);
    } finally {
      setPulling(false);
    }
  }

  const wrap: React.CSSProperties = { maxWidth: 1240, margin: "0 auto", padding: "0 26px" };
  const price = fmtUsdc(machine.pullPrice);
  const featured = recent[0];

  return (
    <div style={{ minHeight: "100vh" }}>
      <Header account={account} balance={balance} chainOk={chainOk} connecting={connecting} onConnect={connect} onDisconnect={disconnect} />

      <>
          {/* hero */}
          <section style={{ ...wrap, paddingTop: 50, paddingBottom: 46 }}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.05fr) minmax(0,0.95fr)", gap: 40, alignItems: "center" }}>
              <div>
                <div className="label" style={{ color: "var(--muted-dark)", marginBottom: 22 }}>Autonomous collectible machine · ARC</div>
                <h1 className="display" style={{ fontSize: "clamp(42px, 6.2vw, 86px)", color: "var(--pale)" }}>
                  Insert a quarter.
                </h1>
                <h1 className="display" style={{ fontSize: "clamp(42px, 6.2vw, 86px)", color: "var(--cream)" }}>
                  Pull a <span className="accent-i" style={{ fontSize: "1.06em" }}>card</span>.
                </h1>
                <p style={{ fontSize: 17, color: "var(--muted-dark)", maxWidth: 470, lineHeight: 1.6, marginTop: 22 }}>
                  ${price} of USDC and the machine mints you a random collectible — on-chain, on the
                  spot. No shopkeeper, no token to buy. The contract is the merchant.
                </p>
                <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
                  <a href="#machine" className="pill">Pull a card <Arrow /></a>
                  <a href="#drops" className="link" style={{ marginLeft: 6 }}>
                    <span>See the drops</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </a>
                </div>
                <div style={{ display: "flex", gap: 34, marginTop: 40, flexWrap: "wrap" }}>
                  {[
                    { k: "Cards minted", v: machine.cards.toString() },
                    { k: "USDC settled", v: "$" + fmtUsdc(machine.revenue) },
                    { k: "Per pull", v: "$" + price },
                  ].map((s) => (
                    <div key={s.k}>
                      <div className="display" style={{ fontSize: 30, color: "var(--cream)" }}>{s.v}</div>
                      <div className="label" style={{ color: "var(--faint)", marginTop: 4 }}>{s.k}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* featured drop */}
              <div>
                {featured ? (
                  <div style={{ maxWidth: 340, margin: "0 auto" }}>
                    <div className="label" style={{ color: "var(--faint)", marginBottom: 10, textAlign: "center" }}>Latest drop</div>
                    <CardTile card={featured} me={account} size="lg" />
                  </div>
                ) : (
                  <div className="card-dark" style={{ aspectRatio: "4/3", display: "flex", alignItems: "center", justifyContent: "center", maxWidth: 340, margin: "0 auto", color: "var(--faint)" }}>
                    <span style={{ fontSize: 60, opacity: 0.5 }}>🎰</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* machine */}
          <section id="machine" style={{ background: "var(--dark-2)", borderTop: "1px solid var(--line-dark)", borderBottom: "1px solid var(--line-dark)" }}>
            <div style={{ ...wrap, paddingTop: 48, paddingBottom: 48, display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 40, alignItems: "center" }}>
              <div>
                <h2 className="display" style={{ fontSize: "clamp(32px,4vw,52px)", color: "var(--cream)", marginBottom: 14 }}>
                  One pull, <span className="accent-i">${price}</span>.
                </h2>
                <p style={{ fontSize: 15.5, color: "var(--muted-dark)", lineHeight: 1.6, marginBottom: 22, maxWidth: 420 }}>
                  Press the button, the machine rolls on-chain and a card drops straight into your
                  wallet. Odds are fixed in the contract — check them yourself.
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
                  {RARITIES.map((r) => (
                    <span key={r.name} style={{ display: "inline-flex", alignItems: "center", gap: 7, border: "1px solid var(--line-dark)", borderRadius: 999, padding: "6px 12px", fontSize: 12.5 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 99, background: r.color }} />
                      <span style={{ color: "var(--cream)", fontWeight: 600 }}>{r.name}</span>
                      <span style={{ color: "var(--faint)" }}>{r.odds}</span>
                    </span>
                  ))}
                </div>
                <button onClick={pull} disabled={pulling || (!!account && machine.pullPrice === 0n)} className="pill pill--orange" style={{ fontSize: 17, padding: "9px 9px 9px 26px" }}>
                  {pulling ? "Rolling…" : !account ? "Connect & pull" : machine.pullPrice === 0n ? "Loading…" : `Pull a card · $${price}`}
                  <Arrow />
                </button>
                {pullMsg && (
                  <div style={{ marginTop: 14, fontSize: 14, fontWeight: 600, color: pullMsg.startsWith("✗") ? "#e58b6b" : "var(--muted-dark)" }}>
                    {pullMsg}
                  </div>
                )}
              </div>

              {/* reveal slot */}
              <div style={{ display: "flex", justifyContent: "center" }}>
                {revealed ? (
                  <div style={{ width: "100%", maxWidth: 320 }}>
                    <div className="label" style={{ textAlign: "center", color: "var(--pale)", marginBottom: 10 }}>You pulled</div>
                    <CardTile card={revealed} me={account} size="lg" />
                  </div>
                ) : (
                  <div
                    style={{
                      width: "100%",
                      maxWidth: 320,
                      aspectRatio: "4/3",
                      borderRadius: 18,
                      border: "1px dashed var(--line-dark)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      color: "var(--faint)",
                    }}
                  >
                    <span style={{ fontSize: 46, opacity: 0.55 }}>🎴</span>
                    <span style={{ fontSize: 13 }}>your card appears here</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* collection */}
          {account && collection.length > 0 && (
            <section style={{ ...wrap, paddingTop: 48 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 18 }}>
                <h2 className="display" style={{ fontSize: 32, color: "var(--cream)" }}>Your shelf</h2>
                <span className="label" style={{ color: "var(--faint)" }}>{collection.length} cards</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 14 }}>
                {collection.map((c) => <CardTile key={c.id} card={c} me={account} />)}
              </div>
            </section>
          )}

          {/* drops */}
          <section id="drops" style={{ ...wrap, paddingTop: 48, paddingBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 18 }}>
              <h2 className="display" style={{ fontSize: 32, color: "var(--cream)" }}>Latest drops</h2>
              <span className="label" style={{ color: "var(--faint)" }}>straight from the chain</span>
            </div>
            {recent.length === 0 ? (
              <div className="card-dark" style={{ padding: 46, textAlign: "center", color: "var(--muted-dark)" }}>
                The machine is loaded but untouched. Be the first to pull ↑
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 14 }}>
                {recent.map((c) => <CardTile key={c.id} card={c} me={account} />)}
              </div>
            )}
          </section>

          {/* why ARC — cream editorial band */}
          <section style={{ background: "var(--cream)", color: "var(--ink)", marginTop: 56 }}>
            <div style={{ ...wrap, paddingTop: 64, paddingBottom: 64 }}>
              <h2 className="display" style={{ fontSize: "clamp(34px,5vw,64px)", maxWidth: 760, marginBottom: 26 }}>
                Built for <span className="accent-i">tiny</span> money.
              </h2>
              <p style={{ fontSize: 18, maxWidth: 720, lineHeight: 1.5, color: "var(--muted-cream)", marginBottom: 12 }}>
                A 25-cent purchase only works if it&apos;s trivially cheap and instant. That&apos;s the
                whole reason WaxList lives on ARC — and nowhere else.
              </p>

              <div style={{ marginTop: 24 }}>
                {[
                  { n: "01", claim: "Every pull is a $0.25 USDC micro-payment.", so: "No token to buy, no approvals, no bridges — the price is plain dollars and the machine settles it in a single transaction." },
                  { n: "02", claim: "Nobody runs the shop.", so: "The contract is the merchant. It takes the coin, rolls the dice and mints your card autonomously, 24/7. Agentic commerce, for real." },
                  { n: "03", claim: "The takings sit in the machine's treasury, on-chain.", so: "Every cent it earns is visible and verifiable on ArcScan. No middleman skimming, no monthly payout you have to chase." },
                ].map((row) => (
                  <div key={row.n} style={{ display: "grid", gridTemplateColumns: "48px minmax(0,1.1fr) 48px minmax(0,1fr)", gap: 20, alignItems: "start", padding: "26px 0", borderTop: "1px solid var(--line-cream)" }}>
                    <div className="display" style={{ fontSize: 18, color: "var(--orange)" }}>{row.n}</div>
                    <div style={{ fontSize: "clamp(18px,2vw,24px)", fontWeight: 700, lineHeight: 1.2 }}>{row.claim}</div>
                    <div style={{ display: "flex", justifyContent: "center", paddingTop: 4 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 999, border: "1px solid var(--orange)", color: "var(--orange)" }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </span>
                    </div>
                    <div style={{ fontSize: 15.5, lineHeight: 1.55, color: "var(--muted-cream)" }}>{row.so}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* footer */}
          <footer style={{ ...wrap, paddingTop: 26, paddingBottom: 40, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "var(--faint)" }}>WaxList · ARC Testnet</span>
            <a href={`${ARCSCAN}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "var(--muted-dark)", textDecoration: "none" }}>
              Verified contract {shortAddr(CONTRACT_ADDRESS, 8, 6)} ↗
            </a>
          </footer>
      </>
    </div>
  );
}
