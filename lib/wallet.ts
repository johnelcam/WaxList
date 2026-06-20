// ---------------------------------------------------------------------------
// Wallet discovery via EIP-6963.
//
// With multiple extensions installed (MetaMask, Rabby, OKX, Phantom, …) they
// race to own window.ethereum and stray requests get eaten. EIP-6963 has each
// wallet announce itself by event, so we can lock onto one specific provider
// (Rabby preferred) and reuse it for every read, write and subscription rather
// than trusting the ambient window.ethereum.
// ---------------------------------------------------------------------------

export interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  isRabby?: boolean;
  isMetaMask?: boolean;
}

interface ProviderDetail {
  info: { uuid: string; name: string; icon: string; rdns: string };
  provider: Eip1193Provider;
}

// Wallets we fall back to, in order, when nothing has been pinned yet.
const PREFERENCE = ["io.rabby", "io.metamask"];

// localStorage key for the pinned wallet's rdns. Built from a namespace +
// a slug so the scheme is consistent across the app's stored values.
const STORE_NS = "wl";
const pinnedRdnsStoreKey = [STORE_NS, "pinned", "rdns"].join(":");

// Every provider that has announced itself this session.
const announced: ProviderDetail[] = [];

function upsert(detail?: ProviderDetail) {
  if (!detail?.info?.rdns || !detail.provider) return;
  const at = announced.findIndex((d) => d.info.rdns === detail.info.rdns);
  if (at === -1) announced.push(detail);
  else announced[at] = detail;
}

if (typeof window !== "undefined") {
  window.addEventListener("eip6963:announceProvider", (e: Event) => {
    upsert((e as CustomEvent<ProviderDetail>).detail);
  });
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

export function setChosenRdns(rdns: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(pinnedRdnsStoreKey, rdns);
  } catch {
    /* ignore */
  }
}

export function getChosenRdns(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(pinnedRdnsStoreKey) || "";
  } catch {
    return "";
  }
}

export function refreshWallets() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("eip6963:requestProvider"));
}

/** Resolve once at least one wallet has announced (or a short timeout). */
export function ensureDiscovered(timeoutMs = 250): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (announced.length) {
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.removeEventListener("eip6963:announceProvider", onAnnounce);
      resolve();
    };
    const onAnnounce = () => finish();
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    setTimeout(finish, timeoutMs);
  });
}

export function listWallets() {
  refreshWallets();
  return announced.map((d) => ({ name: d.info.name, rdns: d.info.rdns, icon: d.info.icon }));
}

/** Best matching provider detail — pinned choice, then preference, then any. */
export function pickDetail(rdns?: string): { provider: Eip1193Provider; rdns: string } | undefined {
  refreshWallets();
  const want = rdns ?? getChosenRdns();
  if (want) {
    const hit = announced.find((d) => d.info.rdns === want);
    if (hit) return { provider: hit.provider, rdns: hit.info.rdns };
  }
  for (const pref of PREFERENCE) {
    const hit = announced.find((d) => d.info.rdns === pref);
    if (hit) return { provider: hit.provider, rdns: hit.info.rdns };
  }
  if (announced[0]) return { provider: announced[0].provider, rdns: announced[0].info.rdns };
  return undefined;
}

/** Best injected provider. Defaults to the pinned wallet, then Rabby/MetaMask. */
export function pickProvider(rdns?: string): Eip1193Provider | undefined {
  const d = pickDetail(rdns);
  if (d) return d.provider;
  return typeof window !== "undefined" ? (window.ethereum as Eip1193Provider | undefined) : undefined;
}
