# GEMINI.md

Gemini: the canonical engineering instructions for this repository live in
**[`AGENTS.md`](./AGENTS.md)**. Read and follow it in full before acting.

## Gemini-specific reminders

- Adhere to the **Strict Engineering Workflows** in `AGENTS.md` §2: TDD,
  small atomic git commits, and the verify-before-committing loop.
- Order of operations for any new task (`AGENTS.md` §4):
  1. Define TypeScript interfaces/types.
  2. Write Vitest tests for nominal and edge cases.
  3. Write the minimal implementation to pass them.
  4. Run `npm run test`, confirm green, then issue an atomic conventional commit.
- Web3 work uses **Viem** for ENS resolution and text-record parsing.
- The **Ledger** device is the hardware escalation gate; never bypass on-device
  confirmation for high-value or high-risk actions.
- North-star reference material is under [`docs/`](./docs/).
