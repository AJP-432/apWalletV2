---
title: Security Key
category: explanation
description: How your Ledger acts as a FIDO2 hardware security key to gate access to services like GitHub, npm, and 1Password.
---

# Security Key

Your Ledger can act as a FIDO2 hardware security key, adding a physical gate to
sign-in flows for services such as GitHub, npm, 1Password, and Discord.

## How it works

FIDO2 replaces or supplements passwords with a cryptographic challenge that only
the registered physical device can answer. When you register your Ledger as a
security key for a service, that service requires the device at sign-in. If
credentials are leaked or stolen, the account remains locked without the
physical hardware. The private key used to answer the challenge is generated
on-device and never exposed.

This creates a meaningful constraint for agent-assisted workflows. Agents
operating in your environment can use a session you have already opened, but they
cannot independently start a new authenticated session to a hardware-gated
service. The human had to be present to open the session — that is the
guarantee.

## In the context of AI tools

Hardware-gated sign-in means agents always operate within sessions that required
human presence to establish. For developers building processes where agents call
external services, gating those services behind hardware authentication is one
of the most direct ways to enforce a human-in-the-loop requirement without
building a custom approval layer.

> ℹ️ The Security Key app on Ledger supports FIDO2 and U2F. Service-specific
> setup varies; check the service's documentation alongside the Ledger Help
> Center article linked below.

## Further reading

- Security Key setup guide (Ledger Help Center):
  <https://support.ledger.com/fr/article/12350325732893-zd>
- [Ledger Wallet CLI](./ledger-wallet-cli.md): manage accounts and run agent
  workflows from the terminal
