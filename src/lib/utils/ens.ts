/**
 * ENS utilities — the Identity & Governance layer.
 *
 * Agents are ENS subnames (e.g. `agent-01.user.eth`). Their operational
 * parameters live in ENSIP-26 text records and are resolved at runtime with
 * Viem — never hard-coded. This module reads the `max_budget` record, which
 * caps how much an agent may spend autonomously before it must escalate to a
 * Ledger signature.
 *
 * Fail-safe contract:
 *  - record unset / empty  -> `null` (caller MUST treat as "escalate", not "unlimited")
 *  - record set & valid    -> budget in wei (`bigint`)
 *  - record set & invalid  -> throws `InvalidEnsBudgetError`
 *
 * See: docs/ens/ensip-26-agent-text-records.md, AGENTS.md
 */

import { parseEther } from 'viem';
import { normalize } from 'viem/ens';

/** ENSIP-26 text-record keys this project reads. */
export const ENS_TEXT_KEYS = {
	MAX_BUDGET: 'max_budget',
	ALLOWED_TASK: 'allowed_task'
} as const;

/**
 * Minimal structural interface for the one Viem client method we depend on.
 * A full Viem `PublicClient` satisfies this, and tests can supply a mock.
 */
export interface EnsTextReader {
	getEnsText(args: { name: string; key: string }): Promise<string | null>;
}

/** Thrown when a `max_budget` record exists but cannot be parsed as a valid budget. */
export class InvalidEnsBudgetError extends Error {
	readonly name = 'InvalidEnsBudgetError';
	readonly ensName: string;
	readonly rawValue: string;

	constructor(ensName: string, rawValue: string) {
		super(`Invalid max_budget for ENS name "${ensName}": received "${rawValue}".`);
		this.ensName = ensName;
		this.rawValue = rawValue;
	}
}

/**
 * Fetch and parse an agent's `max_budget` ENSIP-26 text record.
 *
 * @param client A Viem public client (or any `EnsTextReader`).
 * @param name   The agent's ENS name, e.g. `agent-01.user.eth`.
 * @returns The budget in **wei** (`bigint`), or `null` when the record is unset.
 * @throws {InvalidEnsBudgetError} when the record exists but is not a valid,
 *         non-negative amount.
 */
export async function fetchMaxBudget(client: EnsTextReader, name: string): Promise<bigint | null> {
	const normalized = normalize(name);
	const raw = await client.getEnsText({ name: normalized, key: ENS_TEXT_KEYS.MAX_BUDGET });

	if (raw === null || raw === undefined || raw.trim() === '') {
		return null;
	}

	const value = raw.trim();

	let budgetWei: bigint;
	try {
		budgetWei = parseEther(value);
	} catch {
		throw new InvalidEnsBudgetError(name, raw);
	}

	if (budgetWei < 0n) {
		throw new InvalidEnsBudgetError(name, raw);
	}

	return budgetWei;
}
