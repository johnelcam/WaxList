```
┌─────────────────────────────────────────────┐
│  W A X L I S T  ·  COLLECTIBLE PULL MACHINE   │
│                                               │
│  PLEASE READ BEFORE OPERATING                 │
│  Accepts: USDC only   ·   Price: 0.25 / pull  │
│  Attendant on duty: NONE. The unit is self-   │
│  serve and runs itself. Pull at any hour.     │
└─────────────────────────────────────────────┘
```

This is a real machine, not a metaphor. It lives at one address on the Arc testnet,
it takes a quarter in USDC, and it hands back a collectible card. There is no
counter, no clerk, no "add to cart." You feed the slot, the slot feeds you. Live unit:
**https://waxlist.vercel.app**

## OPERATING INSTRUCTIONS

**01 — INSERT COIN.** Connect a wallet on Arc testnet and call `pull()`, sending
`0.25` USDC. The unit checks `msg.value >= pullPrice` and rejects short payments with
*"insert more USDC."* Exact change appreciated; overpay is accepted but not refunded.

**02 — THE DRUM SPINS.** Inside the same transaction, the unit hashes
`blockhash(block.number-1)`, `block.prevrandao`, `block.timestamp`, your address and the
new card id into one number. The low end picks one of **12 items**; a separate slice of
that same number rolls your rarity against the odds posted below.

**03 — COLLECT YOUR CARD.** A `Card` (id, owner, item, rarity, mint time, price paid) is
written under your address and a `Pulled` event fires. The card is yours on-chain the
instant the pull confirms — the front end reads it back out of the event so what you see
on screen is the thing the chain actually minted.

> The take goes into the machine's till (`totalRevenue`) and stays inside the contract.
> Only `owner` can ever empty it, via `withdraw()`, and that move emits `Withdrawn`. The
> till is glass — anyone can read the balance.

## DROP RATES

Posted by law of the contract. These four numbers are hard-coded in `_rarity()` and
cannot be changed after deploy — pull the source on ArcScan and re-derive them yourself.

```
ROLL 0–999  →  RARITY        ODDS
   0 – 599  →  COMMON        60.0 %
 600 – 879  →  RARE          28.0 %
 880 – 969  →  EPIC           9.0 %
 970 – 999  →  LEGENDARY      3.0 %
```

Item face is an independent roll across the 12-slot catalogue (floppy disk, cassette,
vinyl, boombox, joystick, polaroid, CRT, disco ball, Rubik's cube, pager, cartridge,
neon sign). Item and rarity are decided together, in one transaction, with no second
draw the operator could lean on.

## A NOTE ON FAIRNESS

The "drum" is on-chain pseudo-randomness seeded from block data. That is honest enough
for a testnet arcade toy and dishonest enough that you should never wager rent on it — a
miner who controls block ordering could nudge a roll. It is posted here so no one is
surprised. Treat the legendary at 3% as a bit of fun, not a financial instrument.

## WHY THIS MACHINE NEEDS ARC TO EXIST AT ALL

A quarter-pull is a brutal unit economic. The thing the customer hands over is twenty-
five cents; if the rails skim a dime in fees and make them sign a token approval first,
the whole novelty is dead before the drum spins. WaxList only pencils out because Arc
settles in **native USDC** and a `pull()` transaction costs a fraction of a cent to land.
The price the customer sees *is* the price — plain dollars, one click, and the coin you pay with is the same one that covers the
transaction — with no separate fee token to top up. Net the 25 cents against a sub-penny settlement and there
is still a product left over. On a chain where moving a stablecoin costs more than the
candy, this machine could never charge a quarter and stay honest.

And the merchant being a contract is the other half. There is no shopkeeper because there
is *no one to be* the shopkeeper at this price point — you can't staff a checkout for
25-cent sales. So the contract takes the coin, rolls the odds, mints the card and books
the revenue with nobody in the loop. That only adds up to a *trustworthy* purchase when
the odds, the mint and the till are all the same public, verifiable transaction. Cheap,
instant, self-serve settlement is the precondition; everything else is just the cabinet.

## MACHINE SPEC

```
unit            WaxList collectible pull machine
address         0xD379CaA9A8dEB9c02A2397467eA331569264052B
network         Arc testnet  ·  chain id 5042002
coin slot       pull()        payable, requires msg.value >= 0.25 USDC
price readout   pullPrice()   currently 0.25e18 (native, 18 decimals)
counters        cardCount() · totalRevenue() · pullsBy(addr)
your shelf      collectionOf(addr) → uint256[]   ·   getCard(id) → Card
till drain      withdraw()    owner only, sends full balance, emits Withdrawn
receipt         event Pulled(id, owner, item, rarity, price)
catalogue       ITEM_COUNT = 12 items × 4 rarities
verify          https://testnet.arcscan.app/address/0xD379CaA9A8dEB9c02A2397467eA331569264052B
```

## NO ATTENDANT, AND NONE SIMULATED

For the record: there is no background bot, no scheduled server job and no x402 paywall
behind this unit. Nobody is being oversold. The "autonomous" part is literally just the
contract doing its job when you call `pull()` — the web page is a thin coin-op cabinet
that talks straight to the chain over a public RPC and keeps no server of its own.

## RUNNING YOUR OWN CABINET

```bash
npm install
npm run dev      # opens the cabinet at http://localhost:3000
```

You'll need an Arc-testnet wallet with a little USDC for the pull plus gas. The address
above is the only contract the cabinet talks to; point it elsewhere by editing
`CONTRACT_ADDRESS` in `lib/waxlist.ts`.

```
═══════════════════════════════════════════════
 KEEP THIS PLACARD WITH THE MACHINE
 Built by John Paul Castro · runs on Arc testnet
═══════════════════════════════════════════════
```
