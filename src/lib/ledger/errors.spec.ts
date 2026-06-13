import { describe, it, expect } from 'vitest';
import { classifyLedgerError, LedgerError, type LedgerErrorKind } from './errors';

/** Minimal stand-in for a Ledger `TransportStatusError` (carries a statusCode). */
const statusErr = (statusCode: number) => ({ name: 'TransportStatusError', statusCode });

describe('classifyLedgerError', () => {
	it('classifies the user-rejection status (0x6985)', () => {
		expect(classifyLedgerError(statusErr(0x6985)).kind).toBe('user-rejected');
	});

	it('classifies a locked device by status (0x5515) and by error name', () => {
		expect(classifyLedgerError(statusErr(0x5515)).kind).toBe('device-locked');
		expect(classifyLedgerError({ name: 'LockedDeviceError' }).kind).toBe('device-locked');
	});

	it('classifies "Ethereum app not open" status codes', () => {
		const appNotOpen = [0x6511, 0x6e00, 0x6e01, 0x6d00];
		for (const code of appNotOpen) {
			expect(classifyLedgerError(statusErr(code)).kind).toBe('app-not-open');
		}
	});

	it('classifies disconnects and cancelled device pickers', () => {
		expect(classifyLedgerError({ name: 'DisconnectedDevice' }).kind).toBe('disconnected');
		expect(classifyLedgerError({ name: 'DisconnectedDeviceDuringOperation' }).kind).toBe(
			'disconnected'
		);
		expect(classifyLedgerError({ name: 'NotFoundError' }).kind).toBe('disconnected');
	});

	it('falls back to "unknown" for unrecognized errors', () => {
		expect(classifyLedgerError(new Error('boom')).kind).toBe('unknown');
		expect(classifyLedgerError(statusErr(0x1234)).kind).toBe('unknown');
	});

	it('returns a LedgerError instance and is idempotent', () => {
		const first = classifyLedgerError(statusErr(0x6985));
		expect(first).toBeInstanceOf(LedgerError);
		// Re-classifying an already-classified error preserves its kind.
		expect(classifyLedgerError(first)).toBe(first);
	});

	it('preserves the status code and original cause', () => {
		const original = statusErr(0x6985);
		const err = classifyLedgerError(original);
		expect(err.statusCode).toBe(0x6985);
		expect(err.cause).toBe(original);
	});

	it('produces a human-readable message per kind', () => {
		const messages: Record<LedgerErrorKind, RegExp> = {
			'user-rejected': /reject/i,
			'device-locked': /lock/i,
			'app-not-open': /app/i,
			disconnected: /disconnect|connect/i,
			unsupported: /support/i,
			unknown: /ledger/i
		};
		expect(messages['user-rejected'].test(classifyLedgerError(statusErr(0x6985)).message)).toBe(
			true
		);
		expect(messages['device-locked'].test(classifyLedgerError(statusErr(0x5515)).message)).toBe(
			true
		);
	});
});
