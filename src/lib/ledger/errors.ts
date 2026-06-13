/**
 * Ledger error classification.
 *
 * Hardware/transport failures arrive as opaque `TransportStatusError`s (a
 * numeric APDU `statusCode`) or named transport errors. `classifyLedgerError`
 * normalizes them into a typed {@link LedgerError} so the UI and the agent
 * runtime can react precisely — distinguishing a deliberate user rejection
 * (a valid outcome) from an operational fault (locked, wrong app, unplugged).
 *
 * See: src/lib/ledger/escalation.ts
 */

/** The distinct failure modes we care about. */
export type LedgerErrorKind =
	| 'user-rejected' // the user pressed reject on the device — a valid outcome
	| 'device-locked' // device is locked (PIN not entered)
	| 'app-not-open' // the Ethereum app is not open / wrong app selected
	| 'disconnected' // device unplugged, or no device chosen in the picker
	| 'unsupported' // the environment has no WebUSB (e.g. Firefox/Safari)
	| 'unknown'; // anything we cannot positively identify

/** APDU status words returned by the device, keyed by meaning. */
const STATUS = {
	USER_REJECTED: 0x6985,
	DEVICE_LOCKED: 0x5515
} as const;

/** Status words that indicate the Ethereum app is not open / wrong app. */
const APP_NOT_OPEN_STATUSES: ReadonlySet<number> = new Set([0x6511, 0x6e00, 0x6e01, 0x6d00]);

const MESSAGES: Record<LedgerErrorKind, string> = {
	'user-rejected': 'The transaction was rejected on the Ledger device.',
	'device-locked': 'The Ledger device is locked. Enter your PIN and try again.',
	'app-not-open': 'Open the Ethereum app on your Ledger device and try again.',
	disconnected: 'The Ledger device disconnected or no device was selected. Reconnect and retry.',
	unsupported: 'WebUSB is not supported in this browser. Use a Chromium-based browser over HTTPS.',
	unknown: 'An unexpected error occurred while communicating with the Ledger device.'
};

export interface LedgerErrorOptions {
	statusCode?: number;
	cause?: unknown;
}

/** A normalized, typed Ledger failure. */
export class LedgerError extends Error {
	readonly name = 'LedgerError';
	readonly kind: LedgerErrorKind;
	readonly statusCode?: number;
	override readonly cause?: unknown;

	constructor(kind: LedgerErrorKind, message?: string, options: LedgerErrorOptions = {}) {
		super(message ?? MESSAGES[kind]);
		this.kind = kind;
		this.statusCode = options.statusCode;
		this.cause = options.cause;
	}
}

function readStatusCode(err: unknown): number | undefined {
	const code = (err as { statusCode?: unknown })?.statusCode;
	return typeof code === 'number' ? code : undefined;
}

function readName(err: unknown): string | undefined {
	const name = (err as { name?: unknown })?.name;
	return typeof name === 'string' ? name : undefined;
}

function kindFromError(err: unknown): LedgerErrorKind {
	const statusCode = readStatusCode(err);
	if (statusCode !== undefined) {
		if (statusCode === STATUS.USER_REJECTED) return 'user-rejected';
		if (statusCode === STATUS.DEVICE_LOCKED) return 'device-locked';
		if (APP_NOT_OPEN_STATUSES.has(statusCode)) return 'app-not-open';
	}

	switch (readName(err)) {
		case 'LockedDeviceError':
			return 'device-locked';
		case 'DisconnectedDevice':
		case 'DisconnectedDeviceDuringOperation':
		case 'NotFoundError':
			return 'disconnected';
		default:
			return 'unknown';
	}
}

/**
 * Normalize any thrown value into a typed {@link LedgerError}. Idempotent: an
 * already-classified `LedgerError` is returned unchanged.
 */
export function classifyLedgerError(err: unknown): LedgerError {
	if (err instanceof LedgerError) return err;

	const kind = kindFromError(err);
	return new LedgerError(kind, MESSAGES[kind], {
		statusCode: readStatusCode(err),
		cause: err
	});
}
