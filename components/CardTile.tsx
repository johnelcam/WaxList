"use client";

import { Card, itemOf, rarityOf, shortAddr, timeAgo } from "@/lib/waxlist";
import { ARCSCAN } from "@/lib/arcNetwork";

export default function CardTile({
  card,
  me = "",
  size = "md",
}: {
  card: Card;
  me?: string;
  size?: "md" | "lg";
}) {
  const item = itemOf(card.item);
  const r = rarityOf(card.rarity);
  const big = size === "lg";
  const isMine = me && card.owner.toLowerCase() === me.toLowerCase();

  return (
    <div
      className="card-dark"
      style={{
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        borderColor: r.color + "66",
      }}
    >
      {/* art */}
      <div
        style={{
          position: "relative",
          aspectRatio: big ? "4 / 3" : "1 / 1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `radial-gradient(120% 120% at 50% 20%, ${r.color}3a, ${r.color}10 55%, transparent)`,
          borderBottom: `1px solid ${r.color}44`,
        }}
      >
        <span style={{ fontSize: big ? 72 : 44, lineHeight: 1, filter: "saturate(1.05)" }}>{item.icon}</span>
        <span
          className="label"
          style={{
            position: "absolute",
            top: 10,
            left: 12,
            color: r.color,
            fontSize: big ? 11 : 9.5,
          }}
        >
          {r.name}
        </span>
        <span style={{ position: "absolute", top: 10, right: 12, fontSize: big ? 12 : 10.5, color: "var(--faint)", fontWeight: 600 }}>
          #{card.id}
        </span>
      </div>

      {/* meta */}
      <div style={{ padding: big ? "16px 18px" : "11px 13px" }}>
        <div className="display" style={{ fontSize: big ? 26 : 16, color: "var(--cream)", letterSpacing: "-0.02em" }}>
          {item.name}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 5, fontSize: big ? 12.5 : 11 }}>
          <a
            href={`${ARCSCAN}/address/${card.owner}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--muted-dark)", textDecoration: "none" }}
          >
            {isMine ? "you" : shortAddr(card.owner)}
          </a>
          {card.mintedAt > 0 && <span style={{ color: "var(--faint)" }}>{timeAgo(card.mintedAt)}</span>}
        </div>
      </div>
    </div>
  );
}
