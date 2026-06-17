import { ethers } from "ethers";
import { ARC_RPC } from "./arcNetwork";

// ─────────────────────────────────────────────────────────────
// WaxList — an autonomous collectible vending machine on ARC.
// One deployed, verified contract — the single source of truth.
// ─────────────────────────────────────────────────────────────
export const CONTRACT_ADDRESS = "0xD379CaA9A8dEB9c02A2397467eA331569264052B";

export const WAXLIST_ABI = [
  "function pullPrice() view returns (uint256)",
  "function cardCount() view returns (uint256)",
  "function totalRevenue() view returns (uint256)",
  "function owner() view returns (address)",
  "function pullsBy(address) view returns (uint256)",
  "function collectionOf(address) view returns (uint256[])",
  "function getCard(uint256) view returns (tuple(uint256 id, address owner, uint8 item, uint8 rarity, uint64 mintedAt, uint256 pricePaid))",
  "function pull() payable returns (uint256)",
  "function withdraw()",
  "event Pulled(uint256 indexed id, address indexed owner, uint8 item, uint8 rarity, uint256 price)",
  "event Withdrawn(address indexed to, uint256 amount)",
];

// ── catalogue (off-chain metadata for on-chain item indexes) ──
export interface Item {
  name: string;
  icon: string;
}
export const ITEMS: Item[] = [
  { name: "Floppy Disk", icon: "💾" },
  { name: "Cassette", icon: "📼" },
  { name: "Vinyl", icon: "💿" },
  { name: "Boombox", icon: "📻" },
  { name: "Joystick", icon: "🕹️" },
  { name: "Polaroid", icon: "📷" },
  { name: "CRT TV", icon: "📺" },
  { name: "Disco Ball", icon: "🪩" },
  { name: "Rubik's Cube", icon: "🧩" },
  { name: "Pager", icon: "📟" },
  { name: "Cartridge", icon: "🎮" },
  { name: "Neon Sign", icon: "💡" },
];

export interface RarityInfo {
  name: string;
  color: string;
  odds: string;
}
export const RARITIES: RarityInfo[] = [
  { name: "Common", color: "#8c8c74", odds: "60%" },
  { name: "Rare", color: "#5d82b8", odds: "28%" },
  { name: "Epic", color: "#8a6fc0", odds: "9%" },
  { name: "Legendary", color: "#e3a52e", odds: "3%" },
];

export function itemOf(i: number): Item {
  return ITEMS[i] ?? { name: "Unknown", icon: "❔" };
}
export function rarityOf(r: number): RarityInfo {
  return RARITIES[r] ?? RARITIES[0];
}

export interface Card {
  id: number;
  owner: string;
  item: number;
  rarity: number;
  mintedAt: number;
  pricePaid: bigint;
}

export interface Machine {
  pullPrice: bigint;
  cards: bigint;
  revenue: bigint;
  owner: string;
}

// ── read helpers ──────────────────────────────────────────────
export function readProvider() {
  return new ethers.JsonRpcProvider(ARC_RPC);
}

export function readContract(provider?: ethers.Provider) {
  return new ethers.Contract(CONTRACT_ADDRESS, WAXLIST_ABI, provider ?? readProvider());
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  const failed: T[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    const settled = await Promise.allSettled(batch.map(fn));
    settled.forEach((s, j) => (s.status === "fulfilled" ? out.push(s.value) : failed.push(batch[j])));
  }
  // Retry transient failures once, in the same bounded batches (never a single
  // unbounded fan-out that could itself trip RPC rate limits).
  for (let i = 0; i < failed.length; i += limit) {
    const settled = await Promise.allSettled(failed.slice(i, i + limit).map(fn));
    for (const s of settled) if (s.status === "fulfilled") out.push(s.value);
  }
  return out;
}

function toCard(c: {
  id: bigint;
  owner: string;
  item: bigint | number;
  rarity: bigint | number;
  mintedAt: bigint | number;
  pricePaid: bigint;
}): Card {
  return {
    id: Number(c.id),
    owner: c.owner,
    item: Number(c.item),
    rarity: Number(c.rarity),
    mintedAt: Number(c.mintedAt),
    pricePaid: c.pricePaid,
  };
}

export async function fetchMachine(contract?: ethers.Contract): Promise<Machine> {
  const c = contract ?? readContract();
  const [pullPrice, cards, revenue, owner] = await Promise.all([
    c.pullPrice(),
    c.cardCount(),
    c.totalRevenue(),
    c.owner(),
  ]);
  return { pullPrice, cards, revenue, owner };
}

const MAX = 60;

export async function fetchRecent(max = 18, contract?: ethers.Contract): Promise<Card[]> {
  const c = contract ?? readContract();
  const count = Number(await c.cardCount());
  if (!count) return [];
  const ids: number[] = [];
  for (let i = count; i >= Math.max(1, count - max + 1); i--) ids.push(i);
  const raw = await mapLimit(ids, 10, async (id) => toCard(await c.getCard(id)));
  raw.sort((a, b) => b.id - a.id);
  return raw;
}

export async function fetchCollection(addr: string, contract?: ethers.Contract): Promise<Card[]> {
  const c = contract ?? readContract();
  const ids: bigint[] = await c.collectionOf(addr);
  const raw = await mapLimit(ids.slice(-MAX).map(Number), 10, async (id) => toCard(await c.getCard(id)));
  raw.sort((a, b) => b.id - a.id);
  return raw;
}

export async function fetchCard(id: number, contract?: ethers.Contract): Promise<Card | null> {
  const c = contract ?? readContract();
  try {
    const card = toCard(await c.getCard(id));
    return card.owner === ethers.ZeroAddress ? null : card;
  } catch {
    return null;
  }
}

// ── formatting ────────────────────────────────────────────────
export function shortAddr(addr: string, lead = 6, tail = 4): string {
  if (!addr) return "";
  return `${addr.slice(0, lead)}…${addr.slice(-tail)}`;
}

export function fmtUsdc(wei: bigint, dp = 2): string {
  const n = parseFloat(ethers.formatEther(wei));
  if (n === 0) return "0";
  if (n < 0.01) return n.toFixed(4).replace(/0+$/, "");
  const s = n.toFixed(dp);
  return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
}

export function timeAgo(unixSeconds: number): string {
  if (!unixSeconds) return "";
  const diff = Math.floor(Date.now() / 1000) - unixSeconds;
  if (diff < 0) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
