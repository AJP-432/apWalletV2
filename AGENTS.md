# Project Name: Agentic Wallet Command Center (ETHGlobal 2026)

> This is the canonical north-star instruction file for **any** LLM or human
> working in this repository. `CLAUDE.md` and `GEMINI.md` defer to this file.
> Read it fully before making changes.

## 1. Project Description & Architecture

We are building a highly secure, full-stack framework using SvelteKit,
TypeScript, and Viem to manage autonomous AI agent behaviors while maintaining
absolute user custody. The project relies strictly on two core Web3 pillars:

1. **ENS (Identity & Governance Layer):** Each AI agent is represented by a
   unique ENS subname (e.g., `agent-01.user.eth`). The agent's operational
   permissions, task type restrictions, and strict spending caps are fetched
   dynamically from on-chain ENSIP-26 text records (e.g., `max_budget`,
   `allowed_task`).
2. **Ledger (Hardware Escalation Layer):** Agents simulate low-value operations
   autonomously. The moment an action requires an expense exceeding the
   ENS-configured budget, or is classified as high-risk, the agent halts and
   initiates a hardware-secured escalation path requiring a physical signature
   from a Ledger device.

---

## 2. Strict Engineering Workflows

You (the AI) must adhere to these development patterns at all times. No
exceptions.

### A. Test-Driven Development (TDD) Required

- Every single utility, helper function, state transition, and backend API
  route must be strictly typed and accompanied by a comprehensive unit test
  using **Vitest**.
- Before writing implementation logic, you must write or specify the test
  assertions.
- Code that does not have passing unit tests is considered broken.

### B. Small, Atomic Git Commits

- Code changes must be broken down into the smallest logical, atomic steps
  possible. Do not bundle multiple features or structural changes into a single
  file update.
- A single commit should focus on one exact thing (e.g.,
  `feat: implement ENS metadata parser`,
  `test: add edge-case assertions for ledger escalation state`).

### C. Verify Before Committing Loop

For every code change or generation task, you must follow this exact loop:

1. **Generate/Modify Code:** Write the implementation or test file.
2. **Execute Tests:** Run the environment command to execute the relevant
   Vitest file (`npm run test:unit -- --run <path>`).
3. **Assert Success:** Verify that the unit tests pass cleanly.
4. **Propose Commit:** Only after the test output is verified as passing,
   provide the exact Git command for an atomic commit using structured
   conventional commit formatting.

---

## 3. Tech Stack Restrictions

- **Frontend/Backend Framework:** SvelteKit (TypeScript enabled)
- **Testing Suite:** Vitest
- **Web3 Library:** Viem (for ENS resolutions and text record parsing)
- **Hardware Interface:** `@ledgerhq/hw-app-eth` via WebUSB
- **Design:** TailwindCSS

---

## 4. Immediate Order of Operations

When a new coding task is requested:

1. Define the TypeScript interfaces/types first.
2. Write the Vitest unit tests verifying nominal and edge cases.
3. Write the minimal implementation code to pass those tests.
4. Run the validation check, verify success, and issue the Git commit command.

---

## 5. Repository Map

| Path                   | Purpose                                                    |
| ---------------------- | ---------------------------------------------------------- |
| `src/lib/agent/`       | Agent state machine: types + pure transition logic.        |
| `src/lib/utils/ens.ts` | Viem-based ENS text-record readers (`max_budget`, etc.).   |
| `src/lib/**/*.spec.ts` | Co-located Vitest unit tests (TDD).                        |
| `docs/`                | North-star reference docs (Ledger, ENS, hackathon prizes). |
| `AGENTS.md`            | Canonical engineering instructions (this file).            |

## 6. Common Commands

```bash
npm run dev               # start the SvelteKit dev server
npm run test              # run the full Vitest suite once (CI mode)
npm run test:unit -- --run src/lib/agent/state-machine.spec.ts  # one file
npm run check             # svelte-check + tsc type checking
npm run lint              # prettier --check + eslint
npm run format            # prettier --write
```

## 7. Hard Rules (Phase 1)

- **No hard-coded values** in anything that touches ENS resolution — judges
  explicitly disqualify hard-coded demos. Read from text records at runtime.
- **Never** remove or bypass the Ledger on-device confirmation gate. Agents
  _propose_; the human _verifies_ on hardware.
- Keep the execution engine and UI dashboard out of scope until Phase 1
  (scaffold + tested utilities + docs) is complete and committed.
