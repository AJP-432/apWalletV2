# ENSIP-25: AI Agent Registry ENS Name Verification

**Authors:** premm.eth, raffy.eth, workemon.eth, ses.eth
**Created:** October 2, 2025
**Status:** Draft
**Reference:** <https://docs.ens.domains/ensip/25/>

## Abstract

This ENSIP defines a standardized method for directly verifying, using text
records, the association between an ENS name and an AI agent identity registered
in a specific on-chain AI agent registry.

## Motivation

With the introduction of on-chain AI agent identity registries, such as
ERC-8004, in which agents may declare an associated ENS name, there is a need for
a standardized verification method. This verification process is essential for
establishing trust between an AI agent identity and the ENS name it claims to
control. This ENSIP defines a direct lookup method using a parameterized text
record key that includes a unique agent identifier.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD",
"SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this
document are to be interpreted as described in RFC 2119 and RFC 8174.

### Parameterized Verification Text Record Key

To enable verification of an ENS name from a specific AI agent registry entry,
this ENSIP defines a global parameterized ENS text record key:

```
agent-registration[<registry>][<agentId>]
```

**Where:**

- `<registry>` is the ERC-7930 interoperable address of the registry contract
  (hexadecimal string prefixed with `0x`).
- `<agentId>` is the unique identifier of the agent within that registry.

A verifier resolves this text record on the ENS name and checks that the value
points back to the same registry entry that declared the name — establishing a
bidirectional, trust-minimized link between the agent identity and the ENS name.

> Note: This local copy summarizes the draft for project context. The
> authoritative, complete specification (including exact encoding and the full
> verification algorithm) lives at <https://docs.ens.domains/ensip/25/>. Do not
> hard-code values — resolve and verify records at runtime.

## How this project uses it

The Agentic Wallet Command Center treats each agent as an ENS subname
(`agent-01.user.eth`). Where an agent is also registered in an on-chain registry
(e.g. ERC-8004), ENSIP-25 verification lets the command center confirm the
subname genuinely controls / is controlled by that registry entry before
trusting any operational parameters read via [ENSIP-26](./ensip-26-agent-text-records.md).
