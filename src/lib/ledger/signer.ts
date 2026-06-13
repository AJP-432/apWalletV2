/**
 * Ledger signer — thin, testable wrappers over the `@ledgerhq/hw-app-eth` API.
 *
 * These functions depend only on the {@link EthApp} structural interface (which
 * a real `Eth` instance satisfies), so unit tests can inject a mock and run
 * without hardware. Every transport failure is normalized via
 * {@link classifyLedgerError}.
 *
 * See: src/lib/ledger/transport.ts (real device), src/lib/ledger/errors.ts
 */

import { getAddress } from 'viem';
import { classifyLedgerError } from './errors';

/** ECDSA signature components returned by the device (hex, no 0x prefix). */
export interface EthSignature {
	v: string;
	r: string;
	s: string;
}

/**
 * The subset of `@ledgerhq/hw-app-eth`'s `Eth` API this module uses. A real
 * `Eth` instance is assignable to this interface.
 */
export interface EthApp {
	getAddress(
		path: string,
		boolDisplay?: boolean
	): Promise<{ address: string; publicKey: string; chainCode?: string }>;
	signTransaction(path: string, rawTxHex: string, resolution?: unknown): Promise<EthSignature>;
}

/** Default Ethereum BIP-32 derivation path (account 0, first address). */
export const DEFAULT_ETH_PATH = "44'/60'/0'/0/0";

/**
 * Derive an Ethereum address from the device.
 *
 * @param app     An {@link EthApp} (real `Eth` instance or mock).
 * @param path    BIP-32 path; defaults to {@link DEFAULT_ETH_PATH}.
 * @param options `display: true` shows the address on the device for the user
 *                to verify before it is trusted.
 * @returns The checksummed (EIP-55) address.
 * @throws {LedgerError} normalized transport failure.
 */
export async function getLedgerAddress(
	app: EthApp,
	path: string = DEFAULT_ETH_PATH,
	options: { display?: boolean } = {}
): Promise<string> {
	try {
		const { address } = await app.getAddress(path, options.display ?? false);
		return getAddress(address);
	} catch (err) {
		throw classifyLedgerError(err);
	}
}

/**
 * Sign a serialized transaction on the device.
 *
 * @param app        An {@link EthApp}.
 * @param path       BIP-32 path to sign with.
 * @param rawTxHex   Serialized transaction hex (with or without `0x`).
 * @param resolution Clear-signing resolution metadata, or `null` to blind-sign.
 * @returns The `v`/`r`/`s` signature.
 * @throws {LedgerError} normalized transport failure (incl. user rejection).
 */
export async function signTransactionWithLedger(
	app: EthApp,
	path: string,
	rawTxHex: string,
	resolution: unknown = null
): Promise<EthSignature> {
	const hex = rawTxHex.startsWith('0x') ? rawTxHex.slice(2) : rawTxHex;
	try {
		return await app.signTransaction(path, hex, resolution);
	} catch (err) {
		throw classifyLedgerError(err);
	}
}
