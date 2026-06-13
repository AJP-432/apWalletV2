# North-Star Documentation

Reference material for any LLM or human building the **Agentic Wallet Command
Center**. These docs are descriptive context, not executable code. The
authoritative engineering workflow lives in [`../AGENTS.md`](../AGENTS.md).

## Contents

### Ledger — Hardware Escalation Layer

- [Agent capabilities with Ledger signers and services](./ledger/agent-capabilities.md)
- [Ledger DMK Skills](./ledger/ledger-dmk-skills.md)
- [Ledger Wallet CLI](./ledger/ledger-wallet-cli.md)
- [Security Key (FIDO2)](./ledger/security-key.md)
- [OpenPGP encryption](./ledger/openpgp-encryption.md)

### ENS — Identity & Governance Layer

- [ENSIP-25: AI Agent Registry ENS Name Verification](./ens/ensip-25-agent-name-verification.md)
- [ENSIP-26: Agent Text Records](./ens/ensip-26-agent-text-records.md)

### Hackathon

- [ETHGlobal 2026 — Prize tracks](./hackathon-prizes.md)

## How this project maps to the docs

| Pillar | Doc | Where it shows up in code |
| ------ | --- | ------------------------- |
| ENS identity & metadata | ENSIP-25 / ENSIP-26 | `src/lib/utils/ens.ts` reads `max_budget` and other text records via Viem. |
| Hardware escalation | Ledger agent capabilities / DMK / Wallet CLI | Agent state machine transitions into `AWAITING_LEDGER_SIGNATURE`; signing is gated on-device. |
