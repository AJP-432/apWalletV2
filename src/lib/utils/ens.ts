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

	const budgetWei = parseNonNegativeEther(value);
	if (budgetWei === null) {
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
