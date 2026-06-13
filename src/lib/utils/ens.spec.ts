import { describe, it, expect, vi } from 'vitest';
import { parseEther } from 'viem';
import {
	fetchMaxBudget,
	fetchAllowedTask,
	fetchAgentRecord,
	ENS_TEXT_KEYS,
	InvalidEnsBudgetError,
	type EnsTextReader
} from './ens';

/**
 * Build a mock Viem client that only implements `getEnsText`. The network is
 * never touched; we assert on how the utility calls the client and how it
 * parses the returned text-record value.
 */
function mockClient(value: string | null): EnsTextReader {
	return {
		getEnsText: vi.fn().mockResolvedValue(value)
	};
}

/** Mock client whose responses depend on the requested text-record key. */
function mockClientByKey(records: Record<string, string | null>): EnsTextReader {
	return {
		getEnsText: vi.fn(({ key }: { key: string }) => Promise.resolve(records[key] ?? null))
	};
}

describe('fetchMaxBudget', () => {
	it('reads the `max_budget` text record and returns the budget in wei', async () => {
		const client = mockClient('0.05');

		const budget = await fetchMaxBudget(client, 'agent-01.user.eth');

		expect(budget).toBe(parseEther('0.05'));
	});

	it('queries the correct, normalized name and the `max_budget` key', async () => {
		const client = mockClient('1');

		await fetchMaxBudget(client, 'Agent-01.User.eth');

		expect(client.getEnsText).toHaveBeenCalledWith({
			name: 'agent-01.user.eth', // normalized via ENSIP-15
			key: ENS_TEXT_KEYS.MAX_BUDGET
		});
	});

	it('returns null when the record is unset (fail safe: caller must escalate)', async () => {
		const client = mockClient(null);

		await expect(fetchMaxBudget(client, 'agent-01.user.eth')).resolves.toBeNull();
	});

	it('treats an empty / whitespace record as unset', async () => {
		const client = mockClient('   ');

		await expect(fetchMaxBudget(client, 'agent-01.user.eth')).resolves.toBeNull();
	});

	it('throws InvalidEnsBudgetError for a non-numeric record', async () => {
		const client = mockClient('not-a-number');

		await expect(fetchMaxBudget(client, 'agent-01.user.eth')).rejects.toBeInstanceOf(
			InvalidEnsBudgetError
		);
	});

	it('throws InvalidEnsBudgetError for a negative budget', async () => {
		const client = mockClient('-0.5');

		await expect(fetchMaxBudget(client, 'agent-01.user.eth')).rejects.toBeInstanceOf(
			InvalidEnsBudgetError
		);
	});

	it('accepts a zero budget (a valid, fully-locked-down agent)', async () => {
		const client = mockClient('0');

		await expect(fetchMaxBudget(client, 'agent-01.user.eth')).resolves.toBe(0n);
	});

	it('surfaces the offending name and raw value on the error', async () => {
		const client = mockClient('abc');

		await expect(fetchMaxBudget(client, 'agent-01.user.eth')).rejects.toThrow(/agent-01\.user\.eth/);
		await expect(fetchMaxBudget(client, 'agent-01.user.eth')).rejects.toThrow(/abc/);
	});
});

describe('fetchAgentRecord (generic reader)', () => {
	it('normalizes the name and returns the trimmed value', async () => {
		const client = mockClient('  scraping  ');

		const value = await fetchAgentRecord(client, 'Agent-01.User.eth', 'allowed_task');

		expect(value).toBe('scraping');
		expect(client.getEnsText).toHaveBeenCalledWith({
			name: 'agent-01.user.eth',
			key: 'allowed_task'
		});
	});

	it('returns null for unset and whitespace-only records', async () => {
		await expect(fetchAgentRecord(mockClient(null), 'agent-01.user.eth', 'x')).resolves.toBeNull();
		await expect(fetchAgentRecord(mockClient('   '), 'agent-01.user.eth', 'x')).resolves.toBeNull();
	});
});

describe('fetchAllowedTask', () => {
	it('reads the `allowed_task` record and returns the trimmed value', async () => {
		const client = mockClient('scraping');

		await expect(fetchAllowedTask(client, 'agent-01.user.eth')).resolves.toBe('scraping');
		expect(client.getEnsText).toHaveBeenCalledWith({
			name: 'agent-01.user.eth',
			key: ENS_TEXT_KEYS.ALLOWED_TASK
		});
	});

	it('returns null when the task record is unset', async () => {
		await expect(fetchAllowedTask(mockClient(null), 'agent-01.user.eth')).resolves.toBeNull();
	});

	it('does not collide with max_budget when both are present', async () => {
		const client = mockClientByKey({
			[ENS_TEXT_KEYS.MAX_BUDGET]: '0.1',
			[ENS_TEXT_KEYS.ALLOWED_TASK]: 'trading'
		});

		await expect(fetchAllowedTask(client, 'agent-01.user.eth')).resolves.toBe('trading');
		await expect(fetchMaxBudget(client, 'agent-01.user.eth')).resolves.toBe(parseEther('0.1'));
	});
});
