# Agentic Wallet Command Center (ETHGlobal 2026)

A secure, full-stack framework for managing autonomous AI agent behaviors while
maintaining **absolute user custody**. Built with SvelteKit, TypeScript, and
Viem.

The system rests on two Web3 pillars:

1. **ENS — Identity & Governance Layer.** Each agent is an ENS subname
   (`agent-01.user.eth`). Its permissions and spending caps live in on-chain
   ENSIP-26 text records (`max_budget`, `allowed_task`) and are resolved at
   runtime — no hard-coded values.
2. **Ledger — Hardware Escalation Layer.** Agents act autonomously for low-value
   tasks. Any action exceeding the ENS-configured budget (or flagged high-risk)
   halts the agent and requires a physical signature on a Ledger device.

> **Phase 1 scope (this repo today):** project scaffold, north-star docs, and
> the foundational unit-tested utilities — the agent state machine and the ENS
> text-record reader. The execution engine and UI dashboard are intentionally
> out of scope until Phase 1 is complete.

## Tech stack

| Layer     | Choice                                      |
| --------- | ------------------------------------------- |
| Framework | SvelteKit (TypeScript)                      |
| Testing   | Vitest                                      |
| Web3      | Viem (ENS resolution & text-record parsing) |
| Hardware  | `@ledgerhq/hw-app-eth` via WebUSB           |
| Styling   | TailwindCSS                                 |

## Project structure

```
src/lib/
  agent/        # Agent state machine: types + pure transition function (+ tests)
  utils/ens.ts  # Viem ENS text-record readers (max_budget, ...) (+ tests)
docs/           # North-star reference docs (Ledger, ENS, hackathon prizes)
AGENTS.md       # Canonical engineering instructions for LLMs/humans
```

## Engineering workflow

This project follows a strict workflow defined in [`AGENTS.md`](./AGENTS.md):
**Test-Driven Development**, **small atomic git commits**, and a
**verify-before-committing loop**. Types first, tests second, implementation
third. Code without passing unit tests is considered broken.

## Commands

```bash
npm run dev      # start the dev server (npm run dev -- --open to open a tab)
npm run build    # production build
npm run preview  # preview the production build
npm test         # run the full Vitest suite once (CI mode)
npm run test:unit                                   # watch mode
npm run test:unit -- --run src/lib/agent/state-machine.spec.ts  # single file
npm run check    # svelte-check + TypeScript type checking
npm run lint     # prettier --check + eslint
npm run format   # prettier --write
```

## Documentation

Start at [`docs/README.md`](./docs/README.md) for the Ledger and ENS reference
material and the ETHGlobal prize-track map.
