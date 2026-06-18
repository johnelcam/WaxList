# WaxList

An on-chain vending machine for collectible cards. Drop in **$0.25 of USDC**, the
contract rolls the dice and mints you a random card — item + rarity — straight to
your wallet. There's no shopkeeper. The contract *is* the shop.

**Play it →** https://waxlist.vercel.app

## Drop rates

| Rarity     | Odds |
| ---------- | ---- |
| Common     | 60%  |
| Rare       | 28%  |
| Epic       | 9%   |
| Legendary  | 3%   |

Twelve items, four rarities, all fixed in the contract — pull the source on ArcScan
and check the math yourself.

## How the machine runs

- You call `pull()` with $0.25 of USDC.
- The contract mixes block data into a number, picks an item + a rarity, and writes
  the card to your address.
- The quarter lands in the machine's treasury — visible on-chain, withdrawable only
  by the operator.

That whole loop is a single transaction. Which is exactly the point ↓

## Why it can only live on ARC

A 25-cent purchase has to be *cheap and instant* or nobody bothers. ARC settles in
**native USDC**, so the price is plain dollars — no token to buy, no approval to sign,
no bridge to cross. Take that away and a quarter-a-pull machine isn't worth building.
It's agentic commerce that actually pencils out.

> Heads up: the card randomness is on-chain pseudo-randomness (block data). Perfect for
> a testnet arcade toy, not for anything you'd bet the house on.

## One contract

`0xD379CaA9A8dEB9c02A2397467eA331569264052B` — verified on
[ArcScan](https://testnet.arcscan.app/address/0xD379CaA9A8dEB9c02A2397467eA331569264052B).
Every pull, every card, every cent runs through it. Nothing else to trust.

## Built with

Next.js · ethers v6 · Solidity · EIP-6963 wallets · static on Vercel — no backend, it
reads straight from the chain.
