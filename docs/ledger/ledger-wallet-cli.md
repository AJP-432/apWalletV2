---
title: Ledger Wallet CLI
category: how-to
description: Install the Ledger Wallet CLI, optional agent skill, and use accounts, send, receive, swap, and earn from the terminal with device confirmation.
agent_skills:
  - label: Wallet CLI Usage
    url: https://raw.githubusercontent.com/LedgerHQ/agent-skills/main/skills/wallet-cli/wallet-cli-usage/SKILL.md
    role: primary
    refs:
      - label: Business Logic
        url: https://raw.githubusercontent.com/LedgerHQ/agent-skills/main/skills/wallet-cli/wallet-cli-usage/references/business-logic.md
---

# Ledger Wallet CLI

This guide shows you how to install the Ledger Wallet CLI and run common
workflows from the terminal: account discovery, transfers, swaps, and staking
positions. Every command that touches your funds is confirmed on the Ledger
device before it runs.

> ⚠️ The Ledger Wallet CLI is in early development (v1 experimental). Flags and
> behavior may change.

> ℹ️ This CLI manages **personal accounts**. Looking for something else? The
> Ledger Enterprise CLI covers institutional, policy-enforced workflows. The
> Ledger Enterprise Multisig CLI covers Safe multisig wallets.

## Verify your signer

Before running any workflow, you can confirm that your Ledger is genuine.
`genuine-check` verifies the device's authenticity against Ledger's attestation
service and exits with a non-zero code if it fails. Run it once after setup, or
include it as a guard in automated workflows.

```bash
wallet-cli genuine-check
✔ Device is genuine
```

## Conventions

- Every command supports `--format json` for piping into other tools.
- Signing commands follow the same pattern: the terminal announces what is about
  to happen, you confirm on the Ledger screen, the terminal reports the outcome.
- Read-only commands (balances, operations, `earn list`) never touch the device
  and are safe to run in CI or from an untrusted agent.

## Supported networks

The CLI supports **Bitcoin**, **Ethereum** (and EVM-compatible chains), and
**Solana**.

| Network        | Balances & ops | Send / receive | Swap | Token lookup |    Earn     |
| -------------- | :------------: | :------------: | :--: | :----------: | :---------: |
| Bitcoin        |       ✓        |       ✓        |  ✓   |      —       |      —      |
| Ethereum / EVM |       ✓        |       ✓        |  ✓   |    ERC-20    | coming soon |
| Solana         |       ✓        |       ✓        |  ✓   |     SPL      |      —      |

## Install

### Install the CLI

```bash
# pnpm
pnpm add -g @ledgerhq/wallet-cli
# npm
npm i -g @ledgerhq/wallet-cli
# yarn
yarn global add @ledgerhq/wallet-cli
# bun
bun add -g @ledgerhq/wallet-cli
```

```bash
wallet-cli --version
wallet-cli v1.0.1

wallet-cli --help # list all available commands

Commands:
  account        Account management commands
  assets         Crypto-assets store queries (resolve tokens by address or id)
  balances       Fetch native and token balances for an account (no device required)
  genuine-check  Check whether the connected Ledger device is genuine
  operations     List operations for an account (no device required)
  receive        Get receive address for an account (optionally verify on device)
  send           Sign and broadcast a transaction
  session        Session management commands
  swap           Swap-related commands
```

### Install the agent skill

The agent skill teaches Claude Code, Cursor, and similar tools to drive the CLI
from natural language.

```bash
npx skills add LedgerHQ/agent-skills -s wallet-cli-usage
```

## Manage accounts

Run `account discover` once per network to derive every account on the device.
After that, balances and operations work without the device plugged in. Pass
`bitcoin`, `ethereum`, or `solana` as the network argument.

```bash
# Discover accounts — device required once per network
wallet-cli account discover ethereum
ethereum:main account #0 0x71C7…976F
ethereum:main account #1 0x9A44…47F3

# Read balances — no device needed
wallet-cli balances <label>
✔ Balances fetched
  1.5 ETH
  100 USDT

# List operations — paginated
wallet-cli operations <label> --limit 20
```

`account discover` saves the account label to a local session so subsequent
commands do not need the device. Use `session view` to inspect what is stored
and `session reset` to clear it.

```bash
wallet-cli session view
wallet-cli session reset
Removed 2 accounts from session.
```

## Send and receive

`receive` shows a fresh address and asks you to verify it on the device screen.
`send` prompts you to review the transaction on-device before signing. Amounts
must include a ticker; it drives token resolution. Use `--dry-run` to estimate
fees without touching the device.

Network-specific flags:

| Flag              | Network                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| `--fee-per-byte`  | Bitcoin only                                                                                        |
| `--rbf`           | Bitcoin only                                                                                        |
| `--data`          | Ethereum / EVM only (calldata)                                                                      |
| `--mode`          | Solana only (`send`, `stake.createAccount`, `stake.delegate`, `stake.undelegate`, `stake.withdraw`) |
| `--validator`     | Solana staking only                                                                                 |
| `--stake-account` | Solana staking only                                                                                 |
| `--memo`          | Solana only                                                                                         |

```bash
# Receive — verify address on-device
wallet-cli receive <label>
0x1a2B...9a0b
Compare the address above with what's shown on your Ledger...
[⧖] Review address on device. Approve or reject
✔ Address verified

# Send — native, token, dry-run
wallet-cli send <label> --to 0xDEF… --amount '0.1 ETH'
To:  0xDEF…
Amount: 0.1 ETH
Fees: 0.0004961 ETH
⧖  Review on device. Approve or reject.
✔ Signed → broadcast → 0x8f4a2b…91d3e6
```

## Resolve tokens

`assets token` and `assets token-by-id` let agents and scripts look up the
canonical Ledger token id from a contract address or from an id they already
hold. The resolved id is what `swap quote --from` / `--to` expects.

```bash
wallet-cli assets token ethereum 0xdac17f958d2ee523a2206206994597c13d831ec7
ethereum/erc20/usd_tether__erc20_

wallet-cli assets token-by-id ethereum/erc20/usd_tether__erc20_
```

Both commands are read-only and require no device.

## Swap

Get a quote, execute the swap, then track its status. The Exchange app on your
device clear-signs the transaction so you can verify the exact amounts and
provider before approving.

```bash
wallet-cli swap quote --from ethereum --to bitcoin --account ethereum-1 --to-account bitcoin-native-1 --amount 0.1
wallet-cli swap execute --from ethereum --to bitcoin --account ethereum-1 --to-account bitcoin-native-1 --provider changelly --amount 0.1
⧖  Review the swap on your Ledger. Confirm or reject.
✔ Swap initiated — swp_xyz789
wallet-cli swap status --swap-id <swapId> --provider changelly
Status: ● FINISHED  ·  Received 0.2439 ETH
```

## Earn _(coming soon)_

Read-only visibility into staking opportunities and your active positions. No
device required.

```bash
wallet-cli earn list --network eth
wallet-cli earn positions --network eth
```

## Important Legal notice

The Ledger Wallet CLI is a technology feature that supports AI agents and
terminal-based workflows to prepare and present transactions for hardware
confirmation on a Ledger device. It is not a financial service, brokerage,
investment adviser, or custodian.

Transactions proposed or initiated through this feature require affirmative
physical confirmation by the user on their Ledger device before they are signed
or executed. Ledger does not hold, manage, or have access to user assets at any
time. Ledger exercises no control over, and bears no responsibility for, the
logic, prompts, financial parameters, or economic outcomes of any AI agent nor
for the accuracy, profitability, suitability, or intent of any AI agent. The
user is solely responsible for the logic, instructions, financial parameters,
and outcomes of any transaction proposed or initiated by an AI agent operating
through this CLI. Ledger does not select, recommend, or endorse specific swap
providers, rates, validators, or staking positions. These are presented for user
review and confirmation only.

Details regarding transactions that are displayed by the CLI are provided for
informational purposes only and are sourced from third-party providers. They do
not constitute investment advice or a recommendation to transact. Staking yields
displayed by the earn commands are indicative only and not guaranteed. Ledger is
not party to any swap or staking transaction. The contractual relationship is
between the user and the relevant third-party provider.

Due to the non-deterministic nature of AI models, instructions generated by AI
agents may contain errors, inaccuracies, or unintended parameters. Users must
independently verify all transaction details on the Ledger device screen before
confirming.

Use of this feature does not establish any contractual, advisory, or fiduciary
relationship between the user and Ledger SAS or its affiliates. This tool is
provided "as is," in early experimental development, without warranty of any
kind. To the maximum extent permitted by law, Ledger SAS and its affiliates
shall not be liable for any direct, indirect, incidental, special, punitive, or
consequential damages arising from use of this feature, including but not
limited to loss of digital assets, unauthorised access, smart contract exploits,
or transaction malfunction.
