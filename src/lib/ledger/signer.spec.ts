import { describe, it, expect, vi } from 'vitest';
import {
	getLedgerAddress,
	signTransactionWithLedger,
	DEFAULT_ETH_PATH,
	type EthApp
} from './signer';
import { LedgerError } from './errors';

const LOWER = '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed';
const CHECKSUMMED = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';
const SIGNATURE = { v: '1c', r: 'aa', s: 'bb' };

function mockApp(overrides: Partial<EthApp> = {}): EthApp {
	return {
		getAddress: vi.fn().mockResolvedValue({ address: LOWER, publicKey: '0xpub' }),
		signTransaction: vi.fn().mockResolvedValue(SIGNATURE),
		...overrides
	};
}

describe('getLedgerAddress', () => {
	it('returns a checksummed (EIP-55) address', async () => {
		await expect(getLedgerAddress(mockApp())).resolves.toBe(CHECKSUMMED);
	});

	it('uses the default BIP-32 path and does not display by default', async () => {
		const app = mockApp();
		await getLedgerAddress(app);
		expect(app.getAddress).toHaveBeenCalledWith(DEFAULT_ETH_PATH, false);
	});

	it('verifies on-device when display is requested, and honors a custom path', async () => {
		const app = mockApp();
		await getLedgerAddress(app, "44'/60'/1'/0/0", { display: true });
		expect(app.getAddress).toHaveBeenCalledWith("44'/60'/1'/0/0", true);
	});

	it('wraps transport failures in a typed LedgerError', async () => {
		const app = mockApp({
			getAddress: vi.fn().mockRejectedValue({ name: 'LockedDeviceError' })
		});
		await expect(getLedgerAddress(app)).rejects.toMatchObject({
			name: 'LedgerError',
			kind: 'device-locked'
		});
	});
});

describe('signTransactionWithLedger', () => {
	it('strips the 0x prefix before handing the raw tx to the device', async () => {
		const app = mockApp();
		await signTransactionWithLedger(app, DEFAULT_ETH_PATH, '0xdeadbeef');
		expect(app.signTransaction).toHaveBeenCalledWith(DEFAULT_ETH_PATH, 'deadbeef', null);
	});

	it('accepts a raw tx that is already un-prefixed', async () => {
		const app = mockApp();
		await signTransactionWithLedger(app, DEFAULT_ETH_PATH, 'deadbeef');
		expect(app.signTransaction).toHaveBeenCalledWith(DEFAULT_ETH_PATH, 'deadbeef', null);
	});

	it('returns the v/r/s signature from the device', async () => {
		await expect(
			signTransactionWithLedger(mockApp(), DEFAULT_ETH_PATH, '0xdeadbeef')
		).resolves.toEqual(SIGNATURE);
	});

	it('maps a user rejection to a typed LedgerError', async () => {
		const app = mockApp({
			signTransaction: vi.fn().mockRejectedValue({ name: 'TransportStatusError', statusCode: 0x6985 })
		});
		const err = await signTransactionWithLedger(app, DEFAULT_ETH_PATH, '0xab').catch((e) => e);
		expect(err).toBeInstanceOf(LedgerError);
		expect(err.kind).toBe('user-rejected');
	});
});
