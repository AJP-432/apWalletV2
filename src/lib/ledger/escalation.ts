/**
 * Ledger escalation — bridges hardware signing to the agent state machine.
 *
 * When an agent is in `AWAITING_LEDGER_SIGNATURE`, the runtime calls
 * {@link confirmOnLedger}. The result is a discriminated union whose `event`
 * field is a valid {@link AgentEvent} for that state:
 *   - approved              -> `LEDGER_APPROVED` -> EXECUTING
 *   - user rejected         -> `LEDGER_REJECTED` -> HALTED
 *   - operational fault     -> `ERROR`           -> HALTED
 *
 * See: src/lib/ledger/signer.ts, src/lib/agent/state-machine.ts
 */

import type { AgentEvent } from '../agent/types';
import { classifyLedgerError, type LedgerErrorKind } from './errors';
import { signTransactionWithLedger, type EthApp, type EthSignature } from './signer';

export type LedgerApproval =
	| { event: Extract<AgentEvent, 'LEDGER_APPROVED'>; signature: EthSignature }
	| { event: Extract<AgentEvent, 'LEDGER_REJECTED'>; reason: 'user-rejected' }
	| { event: Extract<AgentEvent, 'ERROR'>; kind: LedgerErrorKind; message: string };

/**
 * Request an on-device signature and translate the outcome into an
 * {@link AgentEvent}. Never throws — every failure is reported as a typed
 * result so the runtime can transition deterministically.
 */
export async function confirmOnLedger(
	app: EthApp,
	path: string,
	rawTxHex: string,
	resolution: unknown = null
): Promise<LedgerApproval> {
	try {
		const signature = await signTransactionWithLedger(app, path, rawTxHex, resolution);
		return { event: 'LEDGER_APPROVED', signature };
	} catch (err) {
		const ledgerError = classifyLedgerError(err);
		if (ledgerError.kind === 'user-rejected') {
			return { event: 'LEDGER_REJECTED', reason: 'user-rejected' };
		}
		return { event: 'ERROR', kind: ledgerError.kind, message: ledgerError.message };
	}
}
