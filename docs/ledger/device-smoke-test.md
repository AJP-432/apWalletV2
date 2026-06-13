# Ledger device smoke test (Phase 3)

A 2-minute manual check that the hardware escalation layer talks to a real
device. Unit tests cover the logic with a mocked transport; this verifies the
WebUSB boundary end to end. **A physical Ledger is required — this is not part
of CI.**

## Prerequisites

- [ ] **Chromium-based browser** (Chrome, Edge, Brave). WebUSB is not in
      Firefox or Safari.
- [ ] Dev server on `localhost` (a secure origin) — WebUSB refuses insecure
      origins.
- [ ] Ledger device **unlocked** (PIN entered).
- [ ] The **Ethereum app** is open on the device (install via Ledger Live →
      Manager if missing).
- [ ] **Ledger Live is closed** — only one process can claim the USB device.
- [ ] A data-capable USB cable (many charge-only cables will not enumerate).
- [ ] **Linux only:** install Ledger's udev rules once (see below), then replug.

On Linux, grant the browser USB access to Ledger devices a single time:

```bash
curl -sSL https://raw.githubusercontent.com/LedgerHQ/udev-rules/master/add_udev_rules.sh | sudo bash
```

## Steps

1. Start the dev server:

```bash
npm run dev
```

2. Open <http://localhost:5173/ledger-check> in a Chromium browser.
3. Click **Connect Ledger**. Choose your device in the browser's USB picker.
4. The Ethereum address appears on the device screen — compare it to the
   address shown in the page.

## Expected results

| Outcome                   | What you should see                                                             |
| ------------------------- | ------------------------------------------------------------------------------- |
| Happy path                | Green "Connected ✓" panel with a checksummed `0x…` address matching the device. |
| User dismisses USB picker | Red panel about disconnect / no device selected (`disconnected`).               |
| Device locked             | Red panel: "The Ledger device is locked. Enter your PIN…" (`device-locked`).    |
| Wrong app / dashboard     | Red panel: "Open the Ethereum app…" (`app-not-open`).                           |
| Non-Chromium browser      | Red panel: "WebUSB is not supported…" (`unsupported`).                          |

## What this exercises

`connectLedger()` (`src/lib/ledger/transport.ts`) →
`getLedgerAddress(app, …, { display: true })` (`src/lib/ledger/signer.ts`) →
errors normalized by `classifyLedgerError` (`src/lib/ledger/errors.ts`). The
same `signTransactionWithLedger` / `confirmOnLedger` path is what Phase 4 will
call when the agent enters `AWAITING_LEDGER_SIGNATURE`.

## Notes

- The `/ledger-check` route is a **temporary dev harness**, not the Phase 5
  Command Center UI. It can be removed once the dashboard exists.
- No transaction is signed here — this only derives and verifies an address, so
  it is completely safe to run.
