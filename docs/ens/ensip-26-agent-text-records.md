# ENSIP-26: Agent Text Records

**Status:** Draft
**Reference:** <https://docs.ens.domains/ensip/26/>

## Abstract

ENSIP-26 standardizes a set of ENS **text records** used to describe an AI
agent's operational metadata directly on its ENS name. Because text records are
resolved on-chain and are independent of any single app, they make an agent's
identity, capabilities, and constraints portable across every wallet, app, and
chain that speaks ENS.

## Why this matters for the Agentic Wallet Command Center

This is the **Identity & Governance Layer** of the project. An agent's
permissions are not stored in our database — they are read live from the agent's
ENS name. This is what makes the integration "functional, not cosmetic" (an
explicit ENS prize requirement): **no hard-coded values**, everything resolved at
runtime.

## Text record keys used by this project

| Key            | Meaning                                                                                          | Example value               | Parsed type         |
| -------------- | ------------------------------------------------------------------------------------------------ | --------------------------- | ------------------- |
| `max_budget`   | Maximum spend an agent may authorize autonomously before it must escalate to a Ledger signature. | `0.05` (denominated in ETH) | `bigint` / `number` |
| `allowed_task` | The task category the agent is permitted to perform.                                             | `scraping`                  | `string`            |

> These keys follow the ENSIP-26 "agent text record" convention. The exact key
> namespace may be prefixed (e.g. `agent:max_budget`) as the spec finalizes;
> keep the key constants centralized in `src/lib/utils/ens.ts` so a rename is a
> one-line change. The authoritative list lives at
> <https://docs.ens.domains/ensip/26/>.

## Resolution with Viem

Text records are read with Viem's `getEnsText`, which handles ENSIP-10 wildcard
/ offchain (CCIP-Read) resolution automatically when the resolver supports it:

```ts
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

const client = createPublicClient({ chain: mainnet, transport: http() });

const maxBudget = await client.getEnsText({
	name: 'agent-01.user.eth',
	key: 'max_budget'
});
```

`getEnsText` returns the raw string value or `null` when the record is unset. The
project layer (`src/lib/utils/ens.ts`) is responsible for:

1. Returning a typed, parsed result (e.g. converting `max_budget` to a number).
2. Distinguishing "record not set" (`null`) from "record set but invalid"
   (throw / surface a validation error).
3. Never silently defaulting an unset budget to a non-zero number — an unknown
   budget must fail safe (escalate to hardware).

## Governance flow

```
ENS name (agent-01.user.eth)
        │  getEnsText("max_budget") via Viem
        ▼
  parsed budget cap ──► compare against requested action cost
        │                         │
   within budget             exceeds budget / unset
        ▼                         ▼
  agent acts autonomously   AWAITING_LEDGER_SIGNATURE (hardware escalation)
```

## Hard rules

- **No hard-coded budgets or permissions.** Resolve from ENS at runtime.
- **Fail safe.** Missing, malformed, or unresolvable records must push the agent
  toward hardware escalation, never toward unchecked autonomous spending.
