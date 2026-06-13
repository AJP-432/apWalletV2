/**
 * Browser polyfills for the Ledger libraries.
 *
 * `@ledgerhq/hw-app-eth` and its dependencies assume Node's `Buffer` (and, in
 * places, `global`) exist as globals. Browsers provide neither, which surfaces
 * as a runtime "Buffer is not defined" error. Importing this module before any
 * Ledger code installs the polyfills. It is a no-op on the server (where
 * `Buffer` already exists) and idempotent.
 *
 * Import this FIRST in src/lib/ledger/transport.ts.
 */

import { Buffer } from 'buffer';

const globals = globalThis as typeof globalThis & {
	Buffer?: typeof Buffer;
	global?: typeof globalThis;
};

if (typeof globals.Buffer === 'undefined') {
	globals.Buffer = Buffer;
}

if (typeof globals.global === 'undefined') {
	globals.global = globalThis;
}
