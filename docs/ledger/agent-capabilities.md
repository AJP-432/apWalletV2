---
title: Agent capabilities with Ledger signers and services
category: explanation
description: Hardware-grade signing for AI agents via DMK skills and the Ledger Wallet CLI, with human-in-the-loop confirmation on critical actions.
---

# Agent capabilities with Ledger signers and services

Ledger offers two AI tools, addressed to two different readers and two different
jobs. The **Ledger Wallet CLI** is a terminal binary that you (or your agent)
drive at runtime to manage your own accounts: balances, transfers, swaps, and
staking, with on-device confirmation on every signing step. **DMK skills** are
Markdown instruction sets that your coding agent loads at build time so it can
help you integrate the Device Management Kit into an application you are
building. In both cases, the Ledger device stays the final gate. On top of
either tool, **hardware security features** let you protect the credentials and
service access your agents rely on, using your signer as the hardware gate for
encryption and authentication.

## Pick the tool for your job

The two tools answer different questions. Pick the row that matches what you
want to do; you do not need both.

| If you want to... | Use | Timing | Audience |
| ----------------- | --- | ------ | -------- |
| Manage your own Ledger accounts from a terminal or agent | [Ledger Wallet CLI](./ledger-wallet-cli.md) | runtime | end users / power users |
| Add Ledger support to an app you are building | [DMK skills](./ledger-dmk-skills.md) | build time | application developers |

- **Ledger Wallet CLI (runtime):** Install the CLI, plug in your Ledger, and run
  discover, balances, send, receive, swap, and staking. Drive these commands
  directly from a terminal or through any agent that can run shell commands
  (Claude Code, Cursor, or your own).
- **DMK skills (build time):** Markdown skill files teach your coding agent
  intent mapping, a 5-step execution process with HITL gates, and the concepts
  behind Clear Signing and secure sessions, so the agent helps you write clean
  DMK integration code.

## Works with

- The CLI runs anywhere a shell does: at the terminal directly, or under any
  agent that can run shell commands (Claude Code, Cursor, Claude Desktop, or
  your own).
- The DMK skills work with any coding agent that loads Markdown skill files
  (Claude Code, Cursor, Cline, and similar).

## Get started

Install Ledger agent skills with:

```bash
npx skills add ledgerhq/agent-skills
```

Then go to [Ledger Wallet CLI](./ledger-wallet-cli.md) or
[DMK skills](./ledger-dmk-skills.md) for the full setup. To protect the
credentials and service access your agents rely on, see
[OpenPGP encryption](./openpgp-encryption.md) and [Security Key](./security-key.md).

## CLI use cases

Things you (or your agent) can do once the Ledger Wallet CLI is installed and
your device is plugged in. Hardware confirmation is required for every signing
step.

- **Portfolio snapshot (read-only):** `"Show my ETH balance and last 10
  transactions."` The agent calls balances and operations without touching the
  device. Useful for dashboards, briefings, and health checks.
- **Agent-assisted send (signing):** `"Send 100 USDT to 0xDEF… — confirm on my
  Ledger."` The agent plans the transaction, calls `send --dry-run` to preview
  fees, then triggers hardware signing after your approval.
- **Natural-language swap (swap · v2):** `"Swap 0.1 ETH to BTC at best rate."`
  The agent fetches a quote, surfaces rate and fees in plain English, then Clear
  Signs the swap on your device with one confirm.

## DMK skills use cases

Things your coding agent can help you build once the DMK skills are installed in
your skills directory.

- **Add Ledger to a wallet app (build):** `"Add WebHID-based Ethereum signing to
  my Vite + React wallet."` The agent uses the implementation skill to wire
  transports, sessions, and clear-sign payloads, and surfaces user-rejection
  errors correctly.
- **Add HITL approval to an agent workflow (build):** `"Pause my trading bot and
  require Ledger confirmation before any send."` The agent uses the 5-step
  execution process to insert a hardware approval gate at sensitive steps in
  your own application.

> ℹ️ Both surfaces are in early development. Breaking changes may happen between
> releases. Feedback welcome on the Ledger Discord server
> (https://developers.ledger.com/discord/).

## Important Legal notice

The tools described on this page are technology features. They support
cryptographic signing capabilities and developer resources. They are not
financial services, investment advice, or execution services of any kind. Every
transaction proposed or initiated through these tools requires affirmative
physical confirmation by the user on their Ledger device before it is signed or
executed. Ledger does not hold, manage, or have access to user assets at any
time. Ledger exercises no control over, and bears no responsibility for, the
logic, prompts, financial parameters, or economic outcomes of any AI agent nor
for the accuracy, profitability, suitability, or intent of any AI agent.

These tools are in early development. Features, APIs, and behaviours may change.
They are provided "as is" without warranty of any kind. Use of these tools does
not establish any contractual, advisory, or fiduciary relationship between the
user or developer and Ledger SAS or its affiliates. To the maximum extent
permitted by law, Ledger SAS and its affiliates shall not be liable for any
direct, indirect, incidental, special, or consequential damages arising from use
of these tools, including but not limited to loss of digital assets,
unauthorised access, smart contract exploits, or transaction malfunction.
