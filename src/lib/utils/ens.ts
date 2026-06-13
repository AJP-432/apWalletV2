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
 * Read an arbitrary ENSIP-26 agent text record.
 *
 * Normalizes the name (ENSIP-15) and returns the trimmed value, or `null` when
 * the record is unset or whitespace-only.
 *
 * @param client A Viem public client (or any `EnsTextReader`).
 * @param name   The agent's ENS name, e.g. `agent-01.user.eth`.
 * @param key    The text-record key to read.
 */
export async function fetchAgentRecord(
	client: EnsTextReader,
	name: string,
	key: string
): Promise<string | null> {
	const normalized = normalize(name);
	const raw = await client.getEnsText({ name: normalized, key });

	if (raw === null || raw === undefined) {
		return null;
	}

	const trimmed = raw.trim();
	return trimmed === '' ? null : trimmed;
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
	const value = await fetchAgentRecord(client, name, ENS_TEXT_KEYS.MAX_BUDGET);

	if (value === null) {
		return null;
	}

	let budgetWei: bigint;
	try {
		budgetWei = parseEther(value);
	} catch {
		throw new InvalidEnsBudgetError(name, value);
	}

	if (budgetWei < 0n) {
		throw new InvalidEnsBudgetError(name, value);
	}

	return budgetWei;
}

/**
 * Fetch an agent's `allowed_task` ENSIP-26 text record — the single task
 * category the agent is permitted to perform autonomously.
 *
 * @returns The trimmed task category, or `null` when unset (caller MUST treat
 *          an unset task as "escalate", never as "any task allowed").
 */
export async function fetchAllowedTask(
	client: EnsTextReader,
	name: string
): Promise<string | null> {
	return fetchAgentRecord(client, name, ENS_TEXT_KEYS.ALLOWED_TASK);
}

/**
 * An agent's operational policy, resolved entirely from its ENS text records.
 * `null` fields mean the record is unset — the budget guard treats any null as
 * "must escalate", never as "unrestricted".
 */
export interface AgentPolicy {
	/** Normalized ENS name (ENSIP-15). */
	name: string;
	/** Spending cap in wei, or `null` if unset. */
	maxBudget: bigint | null;
	/** Permitted task category, or `null` if unset. */
	allowedTask: string | null;
}

/**
 * Resolve an agent's full {@link AgentPolicy} from its ENS name in a single,
 * concurrent batch of text-record reads.
 *
 * @throws {InvalidEnsBudgetError} when the `max_budget` record is malformed.
 */
export async function loadAgentPolicy(client: EnsTextReader, name: string): Promise<AgentPolicy> {
	const [maxBudget, allowedTask] = await Promise.all([
		fetchMaxBudget(client, name),
		fetchAllowedTask(client, name)
	]);

	return { name: normalize(name), maxBudget, allowedTask };
}
