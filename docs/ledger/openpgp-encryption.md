---
title: OpenPGP encryption
category: explanation
description: How your Ledger acts as an OpenPGP key to protect secrets used by your agents and tools.
---

# OpenPGP encryption

> 🛠️ **For advanced users.** This app is intended for developers already
> proficient with OpenPGP and GnuPG.

> ⚠️ **Back up your keys.** Keys do not automatically persist across devices, OS
> updates, or app reinstalls. Follow the backup and restore instructions in the
> app-openpgp repository (https://github.com/LedgerHQ/app-openpgp) — losing your
> keys means losing access to anything encrypted against them.

Your Ledger can hold an OpenPGP private key that controls access to encrypted
secrets — files, environment variables, API tokens, and any sensitive material
your agents or tools consume. Because the private key never leaves the device,
anything encrypted against your Ledger is unreadable without it physically
present.

## How it works

When you set up OpenPGP on your Ledger, a key pair is generated and stored on the
device. You encrypt sensitive material against that public key. From that point,
decryption requires the Ledger to be connected. Unplug the device and the
secrets are opaque ciphertext to any process on the machine — including agents.

A stricter mode requires a manual tap on the device for each decryption event.
In that mode, your Ledger becomes an active approval gate: even a process already
running on your machine cannot read a secret without your explicit, on-device
confirmation. This is the hardware-level expression of the principle running
through all of Ledger's AI tools — agents propose, humans verify.

## In the context of AI tools

This matters most in agent workflows where automation handles sensitive
material. An agent that needs API keys or credentials to do its work can only
access those secrets when your signer is present. In tap-required mode, it needs
your confirmation for every individual access.

## Further reading

- OpenPGP on Ledger (Ledger Help Center):
  <https://support.ledger.com/fr/article/115005200649-zd>
- [Ledger Wallet CLI](./ledger-wallet-cli.md): manage accounts and run agent
  workflows from the terminal
