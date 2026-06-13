/**
 * Ledger WebUSB transport — the real-hardware boundary.
 *
 * This is the only module that touches `navigator.usb` and constructs a live
 * `Eth` app, so it runs in the browser only (Chromium, over HTTPS or
 * localhost, started from a user gesture). All testable logic lives one layer
 * up in `signer.ts` / `escalation.ts`, which depend on the `EthApp` interface
 * and can be mocked without hardware.
 *
 * See: src/lib/ledger/signer.ts, docs/ledger/ledger-dmk-skills.md
 */

import Eth from '@ledgerhq/hw-app-eth';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import { classifyLedgerError, LedgerError } from './errors';
import type { EthApp } from './signer';

/** An open connection to a Ledger device. Call `close()` when finished. */
export interface LedgerConnection {
	app: EthApp;
	close(): Promise<void>;
}

/** True when the current environment exposes the WebUSB API. */
export function isWebUsbSupported(): boolean {
	return typeof navigator !== 'undefined' && 'usb' in navigator;
}

/**
 * Open a WebUSB transport and wrap it in an `Eth` app.
 *
 * MUST be called from a user gesture (e.g. a click handler) — WebUSB refuses
 * to start device discovery otherwise.
 *
 * @throws {LedgerError} `unsupported` when WebUSB is unavailable, otherwise a
 *         classified transport failure (e.g. `disconnected` if the user
 *         dismisses the device picker).
 */
export async function connectLedger(): Promise<LedgerConnection> {
	if (!isWebUsbSupported()) {
		throw new LedgerError('unsupported');
	}

	try {
		const transport = await TransportWebUSB.create();
		const app: EthApp = new Eth(transport);
		return {
			app,
			close: () => transport.close()
		};
	} catch (err) {
		throw classifyLedgerError(err);
	}
}
