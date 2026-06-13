# ETHGlobal 2026 — Prize Tracks

Reference for prize targeting. Our two architectural pillars map directly onto
the **ENS** and **Ledger** tracks, which are the primary targets. Other tracks
are listed for opportunistic stretch integrations.

> Universal qualification themes across sponsors: functional demo (no
> hard-coded values), public GitHub repo, short demo video, and often in-person
> presentation at the sponsor booth.

---

## 🎯 Primary targets

### ENS — $20,000 total — <https://ens.domains>

ENS is the identity layer for onchain AI agents: name them, resolve addresses,
spin up subname registries for agent fleets, and store agent metadata in text
records.

| Prize | Pool | Notes |
| ----- | ---- | ----- |
| 🤖 Best ENS Integration for AI Agents | $5,000 (2.5k / 1.5k / 1k) | **Our primary target.** ENS must obviously improve agent identity/discoverability. |
| ✨ Most Creative Use of ENS | $5,000 (2.5k / 1.5k / 1k) | Records as access tokens, credentials, zk proofs, auto-rotating addresses. |
| 🎉 Integrate ENS | $6,000 (split) | Any real ENS code (RainbowKit alone does not count). Must be open source. |
| 🔄 Best ENS Continuity Integration | $4,000 (2.5k / 1.5k) | Continuity Track only — extend an existing product with ENS. |

**Hard requirements:** Demo must be functional with **no hard-coded values**.
Submit a video or live demo link and present at the ENS booth Sunday morning.

**Resources:**
- AI Agent Registry ENS Name Verification — <https://docs.ens.domains/ensip/25/>
- Agent Text Records — <https://docs.ens.domains/ensip/26/>
- Agent-native CLI — <https://github.com/gskril/ens-cli>
- Docs — <https://docs.ens.domains> · Building with AI — <https://docs.ens.domains/building-with-ai>

### Ledger — $10,000 total — <https://ledger.com>

| Prize | Breakdown |
| ----- | --------- |
| 🤖 AI Agents x Ledger | $10,000 — 1st $3,000 · 2nd $2,500 · 3rd $2,000 · 4th $1,500 · 5th $1,000 |

**Description:** Build AI agents and AI-powered products that use Ledger as the
trust layer — projects where device-backed security is central to the product.

**Qualification:** Include feedback on the experience using Ledger docs & SDKs,
identify gaps or missing context, and suggest improvements.

**Resources:** Tracks — <https://developers.ledger.com/ethglobalnyc>. See local
Ledger north-star docs in [`./ledger/`](./ledger/).

---

## Other tracks (stretch / opportunistic)

### Google Cloud — $5,000

- 🤖 Best On-Chain Agent Economy Application — rank agents by ERC-8004
  reputation/feedback; **must use Google BigQuery** for raw Ethereum mainnet
  ERC-8004 data + lightweight frontend.
- Resources: ERC-8004 contracts — <https://github.com/erc-8004/erc-8004-contracts>

### Hedera — $15,000

- AI & Agentic Payments ($6,000), Tokenization ($3,000), "No Solidity Allowed"
  SDK build ($3,000), Autonomous On-Chain Automation (continuity, $3,000).
- Agents must execute ≥1 payment/transfer on Hedera Testnet; public repo + ≤5
  min video. Agent Kit (JS/TS) — <https://github.com/hashgraph/hedera-agent-kit>

### Arc (Circle) — $15,000

- Best Agentic Economy with Circle Agent Stack ($3,500): autonomous agents
  transacting via nanopayments on Arc (gas-free micropayments for API/data/
  compute). Circle Agent Stack — <https://agents.circle.com/>
- Also: advanced stablecoin contracts, chain-abstracted USDC, prediction
  markets, private nanopayments (Dynamic + Unlink + Arc).

### World — $15,000

- AgentKit (Delegated World ID, $7,500), World ID ($2,500), continuity
  ($2,500), ProveKit ($2,500). Human-backed agents; proof validation in backend
  or contract. AgentKit — <https://docs.world.org/agents/agent-kit>

### LI.FI — $15,000

- Composer application ($4,000), UX ($3,500), tooling ($3,500), **Agentic
  Workflows ($4,000)** — Composer as execution layer for autonomous systems.
  Docs — <https://docs.li.fi/composer/composer-api/overview>

### Chainlink — $14,000

- CRE workflows ($6,000), Connect the World ($2,000), Confidential AI Attester
  ($4,000), continuity upgrade ($2,000). CRE docs — <https://docs.chain.link/cre>

### Uniswap Foundation — $10,000

- Best Uniswap API Integration ($7,000), Stack Contribution continuity ($3,000).
  Real onchain execution + tx IDs. Docs — <https://developers.uniswap.org/docs>

### Canton Foundation — $10,000

- Private DeFi, RWA/tokenized assets, payments/neobanking, **Agentic Commerce
  (continuity, $1,500)** — autonomous workflows with constraints encoded in Daml.

### Dynamic — $10,000

- **Best Agentic Build ($2,000)** — agents transact via Dynamic server wallets,
  delegated access, and Flow. Also Flow, money apps, wallet glow-up, private
  nanopayments. Agents — <https://www.dynamic.xyz/docs/overview/agents/overview>

### 1inch — $7,000

- Build an Aqua App ($5,000) + continuity ($2,000). Onchain token-transfer
  execution + proper git history. Aqua SDK — <https://github.com/1inch/sdks>

### Privy — $5,000

- **Best AI agent built with Privy ($1,250)** — agent holds assets / moves money
  via Privy Agent Wallet CLI; ≥1 onchain action. Plus financial product,
  cross-chain funding, continuity. Agent CLI —
  <https://docs.privy.io/recipes/agent-integrations/agent-cli>

### Sui — $15,000

- Walrus storage (continuity, $12,000) + new build with Walrus/Sui stack
  ($3,000). Chain-agnostic; works with EVM apps. Walrus docs — <https://docs.wal.app/>

### Unlink — $5,000

- Privacy SDK integrations (OSS app integration, private nanopayments,
  continuity). Docs — <https://docs.unlink.xyz>

### Blink — $5,000

- Best consumer app with Blink (scratch $3,000 / continuity $2,000) — one-tap
  stablecoin deposit flow. Docs — <https://docs.blink.cash/introduction>
