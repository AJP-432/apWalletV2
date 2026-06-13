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

import { getAddress, parseEther } from 'viem';
import { normalize } from 'viem/ens';

/** ENSIP-26 text-record keys this project reads. */
export const ENS_TEXT_KEYS = {
	MAX_BUDGET: 'max_budget',
	ESCALATION_THRESHOLD: 'escalation_threshold',
	ALLOWED_TASK: 'allowed_task',
	PRICE: 'price',
	SERVICE: 'service'
} as const;

/**
 * Minimal structural interface for the one Viem client method we depend on.
 * A full Viem `PublicClient` satisfies this, and tests can supply a mock.
 */
export interface EnsTextReader {
	getEnsText(args: { name: string; key: string }): Promise<string | null>;
}

/** Extends {@link EnsTextReader} with forward address resolution (ENSIP-9). */
export interface EnsResolver extends EnsTextReader {
	getEnsAddress(args: { name: string }): Promise<string | null>;
}

/**
 * Parse an ETH-denominated record into non-negative wei.
 * @returns wei, or `null` if the value is not a valid non-negative amount.
 */
function parseNonNegativeEther(value: string): bigint | null {
	let wei: bigint;
	try {
		wei = parseEther(value);
	} catch {
		return null;
	}
	return wei < 0n ? null : wei;
}

/** Thrown when an ETH-amount text record exists but cannot be parsed. */
export class InvalidEnsAmountError extends Error {
	readonly name = 'InvalidEnsAmountError';
	readonly ensName: string;
	readonly key: string;
	readonly rawValue: string;

	constructor(ensName: string, key: string, rawValue: string) {
		super(`Invalid ${key} for ENS name "${ensName}": received "${rawValue}".`);
		this.ensName = ensName;
		this.key = key;
		this.rawValue = rawValue;
	}
}

/**
 * Read an ETH-denominated text record and parse it into non-negative wei.
 *
 * @returns wei (`bigint`), or `null` when the record is unset.
 * @throws {InvalidEnsAmountError} when set but not a valid non-negative amount.
 */
export async function fetchEthAmountRecord(
	client: EnsTextReader,
	name: string,
	key: string
): Promise<bigint | null> {
	const value = await fetchAgentRecord(client, name, key);
	if (value === null) {
		return null;
	}
	const wei = parseNonNegativeEther(value);
	if (wei === null) {
		throw new InvalidEnsAmountError(name, key, value);
	}
	return wei;
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
 * @throws {InvalidEnsAmountError} when the record exists but is not a valid,
 *         non-negative amount.
 */
export async function fetchMaxBudget(client: EnsTextReader, name: string): Promise<bigint | null> {
	return fetchEthAmountRecord(client, name, ENS_TEXT_KEYS.MAX_BUDGET);
}

/**
 * Fetch an agent's `escalation_threshold` — the per-action ceiling above which
 * an action must escalate to a Ledger signature regardless of remaining pool.
 *
 * @returns The threshold in **wei**, or `null` when unset.
 * @throws {InvalidEnsAmountError} when set but not a valid non-negative amount.
 */
export async function fetchEscalationThreshold(
	client: EnsTextReader,
	name: string
): Promise<bigint | null> {
	return fetchEthAmountRecord(client, name, ENS_TEXT_KEYS.ESCALATION_THRESHOLD);
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
 * Fetch and parse an agent's `allowed_task` record as a normalized list.
 *
 * The record is a comma-separated list of task categories; values are trimmed,
 * lower-cased, de-duplicated, and emptied entries dropped.
 *
 * @returns The permitted task categories (empty array when unset).
 */
export async function fetchAllowedTasks(client: EnsTextReader, name: string): Promise<string[]> {
	const raw = await fetchAllowedTask(client, name);
	if (raw === null) {
		return [];
	}
	const tasks = raw
		.split(',')
		.map((task) => task.trim().toLowerCase())
		.filter((task) => task.length > 0);
	return [...new Set(tasks)];
}

/**
 * An agent's operational policy, resolved entirely from its ENS text records.
 * `null`/empty fields mean the record is unset — the funding guard treats any
 * gap as "must escalate", never as "unrestricted".
 */
export interface AgentPolicy {
	/** Normalized ENS name (ENSIP-15). */
	name: string;
	/** Total autonomous spending pool in wei, or `null` if unset. */
	maxBudget: bigint | null;
	/** Per-action ceiling in wei above which to escalate, or `null` if unset. */
	escalationThreshold: bigint | null;
	/** Permitted task categories (empty when unset). */
	allowedTasks: string[];
}

/**
 * Resolve an agent's full {@link AgentPolicy} from its ENS name in a single,
 * concurrent batch of record reads.
 *
 * @throws {InvalidEnsAmountError} when an amount record is malformed.
 */
export async function loadAgentPolicy(client: EnsTextReader, name: string): Promise<AgentPolicy> {
	const [maxBudget, escalationThreshold, allowedTasks] = await Promise.all([
		fetchMaxBudget(client, name),
		fetchEscalationThreshold(client, name),
		fetchAllowedTasks(client, name)
	]);

	return { name: normalize(name), maxBudget, escalationThreshold, allowedTasks };
}

/** Thrown when a vendor ENS name cannot be resolved into a payable target. */
export class VendorResolutionError extends Error {
	readonly name = 'VendorResolutionError';
	readonly ensName: string;

	constructor(ensName: string, reason: string) {
		super(`Cannot resolve vendor "${ensName}": ${reason}.`);
		this.ensName = ensName;
	}
}

/**
 * A procurement target resolved from a vendor ENS name. The agent pays
 * `priceWei` to `payee`; both are read live from ENS, never hard-coded.
 */
export interface Vendor {
	/** Normalized vendor ENS name. */
	name: string;
	/** Checksummed payout address (the vendor name's address record). */
	payee: string;
	/** Price the vendor charges, in wei (from the `price` text record). */
	priceWei: bigint;
	/** Optional human-readable description (from the `service` text record). */
	service?: string;
}

/**
 * Resolve a vendor ENS name into a payable {@link Vendor}: its address record
 * (payee) plus its `price` and optional `service` text records.
 *
 * @throws {VendorResolutionError} when the payee or price is missing/invalid.
 */
export async function loadVendor(client: EnsResolver, name: string): Promise<Vendor> {
	const normalized = normalize(name);
	const [payee, priceRaw, service] = await Promise.all([
		client.getEnsAddress({ name: normalized }),
		fetchAgentRecord(client, normalized, ENS_TEXT_KEYS.PRICE),
		fetchAgentRecord(client, normalized, ENS_TEXT_KEYS.SERVICE)
	]);

	if (!payee) {
		throw new VendorResolutionError(name, 'no address record (payee) is set');
	}
	if (priceRaw === null) {
		throw new VendorResolutionError(name, 'no price record is set');
	}

	const priceWei = parseNonNegativeEther(priceRaw);
	if (priceWei === null) {
		throw new VendorResolutionError(name, `price "${priceRaw}" is not a valid amount`);
	}

	return {
		name: normalized,
		payee: getAddress(payee),
		priceWei,
		service: service ?? undefined
	};
}
