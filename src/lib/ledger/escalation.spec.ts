import { describe, it, expect, vi } from 'vitest';
import { confirmOnLedger } from './escalation';
import { DEFAULT_ETH_PATH, type EthApp } from './signer';
import { transition } from '../agent/state-machine';

const SIGNATURE = { v: '1c', r: 'aa', s: 'bb' };

function mockApp(signTransaction: EthApp['signTransaction']): EthApp {
	return {
		getAddress: vi.fn().mockResolvedValue({ address: '0x', publicKey: '0x' }),
		signTransaction
	};
}

describe('confirmOnLedger', () => {
	it('returns LEDGER_APPROVED with the signature, and drives EVALUATING->EXECUTING', async () => {
		const app = mockApp(vi.fn().mockResolvedValue(SIGNATURE));

		const result = await confirmOnLedger(app, DEFAULT_ETH_PATH, '0xabcdef');

		expect(result).toEqual({ event: 'LEDGER_APPROVED', signature: SIGNATURE });
		if (result.event === 'LEDGER_APPROVED') {
			expect(transition('AWAITING_LEDGER_SIGNATURE', result.event)).toBe('EXECUTING');
		}
	});

	it('maps a user rejection to LEDGER_REJECTED, and drives to HALTED', async () => {
		const app = mockApp(
			vi.fn().mockRejectedValue({ name: 'TransportStatusError', statusCode: 0x6985 })
		);

		const result = await confirmOnLedger(app, DEFAULT_ETH_PATH, '0xabcdef');

		expect(result).toEqual({ event: 'LEDGER_REJECTED', reason: 'user-rejected' });
		expect(transition('AWAITING_LEDGER_SIGNATURE', result.event)).toBe('HALTED');
	});

	it('maps an operational fault (locked device) to ERROR with the kind, and drives to HALTED', async () => {
		const app = mockApp(vi.fn().mockRejectedValue({ name: 'LockedDeviceError' }));

		const result = await confirmOnLedger(app, DEFAULT_ETH_PATH, '0xabcdef');

		expect(result.event).toBe('ERROR');
		if (result.event === 'ERROR') {
			expect(result.kind).toBe('device-locked');
			expect(result.message).toMatch(/lock/i);
		}
		expect(transition('AWAITING_LEDGER_SIGNATURE', result.event)).toBe('HALTED');
	});

	it('maps a disconnect to ERROR with kind "disconnected"', async () => {
		const app = mockApp(vi.fn().mockRejectedValue({ name: 'DisconnectedDevice' }));

		const result = await confirmOnLedger(app, DEFAULT_ETH_PATH, '0xabcdef');

		expect(result).toMatchObject({ event: 'ERROR', kind: 'disconnected' });
	});
});
