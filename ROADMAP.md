# Roadmap — Agentic Wallet Command Center

Status legend: ✅ done · 🔜 next · ⬜ planned

This roadmap sequences the build from the current Phase 1 foundation to a
demo-ready submission. It also lists every **API key**, **dependency**, and
**piece of hardware** required, and where each is introduced.

---

## Phase overview

| Phase | Theme                                                  | Status  |
| ----- | ------------------------------------------------------ | ------- |
| 1     | Foundation: scaffold, docs, tested utilities           | ✅ done |
| 2     | Budget guard + ENS metadata layer (full ENSIP-26 read) | 🔜 next |
| 3     | Ledger hardware signing (WebUSB) + escalation wiring   | ⬜      |
| 4     | Agent runtime: drive the state machine end-to-end      | ⬜      |
| 5     | UI: Command Center dashboard (SvelteKit + Tailwind)    | ⬜      |
| 6     | Subname registry for agent fleets (ENS)                | ⬜      |
| 7     | Polish, demo script, video, deploy                     | ⬜      |

---

## Phase 1 — Foundation ✅ (complete)

- ✅ SvelteKit + TS + Vitest + Tailwind scaffold
- ✅ `AGENTS.md` / `CLAUDE.md` / `GEMINI.md` + north-star `docs/`
- ✅ Agent state machine (`src/lib/agent/`) — pure, fail-safe transitions
- ✅ ENS `max_budget` reader (`src/lib/utils/ens.ts`) — Viem, mock-tested

---

## Phase 2 — Budget guard + ENS metadata layer 🔜

Goal: turn a raw ENS name into a fully-typed `AgentPolicy`, and decide whether a
proposed action is autonomous or must escalate.

**Features**

- ⬜ `fetchAllowedTask()` + generic `fetchAgentRecord()` in `ens.ts`
- ⬜ `loadAgentPolicy(client, name)` → `{ maxBudget, allowedTask, ... }` (one batched read)
- ⬜ `src/lib/agent/budget-guard.ts`: `evaluateAction(policy, action)` → `'WITHIN_BUDGET' | 'EXCEEDS_BUDGET'`
- ⬜ Task-type guard: action category must match `allowed_task`, else escalate
- ⬜ Fail-safe: unset/invalid policy always escalates (never "unlimited")

**Tests (TDD first)**

- ⬜ cost == budget (boundary), cost > budget, cost < budget
- ⬜ disallowed task type escalates even when under budget
- ⬜ null/invalid policy escalates

**Keys/hardware:** none (pure logic + mocked client).

---

## Phase 3 — Ledger hardware signing 🔜

Goal: implement the real hardware escalation gate the state machine points at.

**Features**

- ⬜ `src/lib/ledger/transport.ts`: open a WebUSB transport (user-gesture guarded)
- ⬜ `src/lib/ledger/signer.ts`: derive address, sign tx with `@ledgerhq/hw-app-eth`
- ⬜ `getAddress(path)` + on-device address verification
- ⬜ `signTransaction(path, tx)` with Clear-Sign support; surface user-rejection errors
- ⬜ Wire `AWAITING_LEDGER_SIGNATURE` → on approval emit `LEDGER_APPROVED`, on reject `LEDGER_REJECTED`
- ⬜ Connection/health UI states (no device, locked, wrong app open)

**Dependencies to add**

```bash
npm install @ledgerhq/hw-app-eth @ledgerhq/hw-transport-webusb
```

**Tests**

- ⬜ Mock transport: sign/verify happy path, user-rejection, device-locked, timeout
- ⬜ (Manual) real-device smoke test checklist

**Hardware required** — see [Hardware checklist](#hardware-checklist).

---

## Phase 4 — Agent runtime ⬜

Goal: a loop that actually drives the state machine for a (simulated) task.

**Features**

- ⬜ `src/lib/agent/runtime.ts`: holds current `AgentState`, applies events, logs transitions
- ⬜ Pluggable "task executor" interface (Phase-4 uses a mock/simulated low-value task)
- ⬜ Cost estimator for proposed actions (Viem `estimateGas` / fee data)
- ⬜ Optional: LLM "brain" that proposes actions (see LLM API key below)
- ⬜ Event/audit log persisted per agent

**Keys:** Ethereum RPC (required), LLM API key (optional, for autonomous reasoning).

---

## Phase 5 — Command Center UI ⬜

Goal: the dashboard described in the project name.

**Features**

- ⬜ Agent roster (resolve subnames, show policy from ENS — no hard-coded values)
- ⬜ Live state badge per agent (IDLE / SCRAPING / AWAITING_LEDGER_SIGNATURE / …)
- ⬜ "Connect Ledger" flow + escalation modal with on-device confirmation prompt
- ⬜ Action/audit timeline; budget meter (spent vs `max_budget`)
- ⬜ Tailwind styling, responsive, dark mode

**Keys:** RPC; optional WalletConnect/Etherscan for links.

---

## Phase 6 — Subname registry for agent fleets ⬜

Goal: register/discover agents on-chain (directly targets the ENS "AI Agents" prize).

**Features**

- ⬜ Issue `agent-NN.<parent>.eth` subnames programmatically
- ⬜ Write `max_budget` / `allowed_task` text records at issuance
- ⬜ Agent discovery: enumerate the fleet under a parent name
- ⬜ (Stretch) ENSIP-25 verification against an on-chain agent registry (ERC-8004)

**Keys:** ENS subname service API key (e.g. Namestone) OR a deployed
`NameWrapper`/L2 subname contract + a funded deployer key.

---

## Phase 7 — Demo & ship ⬜

- ⬜ Seed a real demo agent name with live text records (testnet or mainnet)
- ⬜ Deploy (Vercel/Netlify adapter), HTTPS (required for WebUSB)
- ⬜ ≤3–5 min demo video, architecture diagram, open-source README
- ⬜ ENS booth presentation (Sunday AM) + Ledger docs/SDK feedback writeup

---

## API keys & environment variables

Create a `.env` (and commit a `.env.example` with empty values). Vite exposes
only `PUBLIC_`-prefixed vars to the client; keep secrets server-side.

| Variable                 | Required?             | Phase | Purpose                                                  | Where to get it             |
| ------------------------ | --------------------- | ----- | -------------------------------------------------------- | --------------------------- |
| `PUBLIC_RPC_URL_MAINNET` | **Required**          | 2+    | Viem transport for ENS reads (ENS lives on mainnet)      | Alchemy / Infura / drpc     |
| `PUBLIC_RPC_URL_SEPOLIA` | Recommended           | 4+    | Free testnet for tx/signing dev (ENS is also on Sepolia) | Alchemy / Infura            |
| `ALCHEMY_API_KEY`        | Required (if Alchemy) | 2+    | Backs the RPC URLs above                                 | <https://alchemy.com>       |
| `LLM_API_KEY`            | Optional              | 4     | Agent reasoning ("brain") — Gemini/Anthropic/OpenAI      | provider console            |
| `NAMESTONE_API_KEY`      | Optional              | 6     | Issue ENS subnames for the fleet without per-name gas    | <https://namestone.com>     |
| `ETHERSCAN_API_KEY`      | Optional              | 5     | Tx links / richer history in the UI                      | <https://etherscan.io/apis> |

Notes:

- **No private keys in env.** Signing happens on the Ledger device — that is the
  entire security model. Never add a hot signing key.
- ENS resolution itself needs only a read RPC; a public endpoint works for dev
  but a keyed provider is far more reliable for the demo.

---

## Hardware checklist

You have a Ledger device — here's everything needed to make it sign in-browser.

| Item                                               | Required?    | Notes                                                                                                   |
| -------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------- |
| Ledger device (Nano S Plus / Nano X / Flex / Stax) | **Required** | Any of these work over USB. (There is no "Nano 43 FF" model — confirm your exact model in Ledger Live.) |
| USB cable (data-capable)                           | **Required** | Many charge-only cables won't enumerate the device.                                                     |
| **Ethereum app** installed on the device           | **Required** | Install via Ledger Live → Manager. Open it before signing.                                              |
| Latest device firmware                             | Recommended  | Update in Ledger Live; needed for Clear Signing of recent tx types.                                     |
| Chromium browser (Chrome / Edge / Brave)           | **Required** | WebUSB is Chromium-only; not supported in Firefox/Safari.                                               |
| `localhost` or HTTPS origin                        | **Required** | WebUSB refuses to run on insecure (non-HTTPS) origins.                                                  |
| Device PIN unlocked + user gesture                 | **Required** | Discovery must start from a click; device must be unlocked.                                             |
| Testnet ETH (Sepolia)                              | Recommended  | For end-to-end signing tests without spending real funds.                                               |

> Transport choice: the stack targets **WebUSB** (`@ledgerhq/hw-transport-webusb`).
> If you hit OS-level USB claim issues (common on Linux without udev rules, or
> when Ledger Live is open and holding the device), `@ledgerhq/hw-transport-webhid`
> is a drop-in alternative. On Linux you may need Ledger's udev rules:
> `curl -sSL https://raw.githubusercontent.com/LedgerHQ/udev-rules/master/add_udev_rules.sh | sudo bash`.

---

## Dependency install summary (by phase)

```bash
# Phase 2 — already have viem
#   (no new deps)

# Phase 3 — hardware signing
npm install @ledgerhq/hw-app-eth @ledgerhq/hw-transport-webusb
#   optional fallback transport:
# npm install @ledgerhq/hw-transport-webhid

# Phase 4 — optional agent brain (pick one)
# npm install @google/genai        # Gemini
# npm install @anthropic-ai/sdk     # Claude
# npm install openai                # OpenAI

# Phase 6 — optional subname issuance
# npm install @namestone/namestone-sdk
```

---

## Risk / dependency notes

- **WebUSB + Ledger Live conflict:** only one process can claim the USB device.
  Close Ledger Live before browser signing, or use WebHID.
- **ENS "no hard-coded values" rule:** every budget/permission must be read live
  from text records — judges disqualify hard-coded demos. Phase 2 enforces this.
- **Clear Signing coverage:** verify the device can clear-sign your demo tx type;
  otherwise the user sees blind-signing warnings.
- **Mainnet vs testnet ENS:** decide early. Mainnet costs gas to set records but
  is the most credible demo; Sepolia is free and judge-acceptable.
