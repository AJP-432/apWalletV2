import { describe, it, expect, vi } from 'vitest';
import { parseEther } from 'viem';
import {
	fetchMaxBudget,
	fetchAllowedTask,
	fetchAgentRecord,
	loadAgentPolicy,
	loadVendor,
	ENS_TEXT_KEYS,
	InvalidEnsBudgetError,
	VendorResolutionError,
	type EnsTextReader,
	type EnsResolver
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

		await expect(fetchMaxBudget(client, 'agent-01.user.eth')).rejects.toThrow(
			/agent-01\.user\.eth/
		);
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

describe('loadAgentPolicy', () => {
	it('aggregates both records into a typed policy with the normalized name', async () => {
		const client = mockClientByKey({
			[ENS_TEXT_KEYS.MAX_BUDGET]: '0.05',
			[ENS_TEXT_KEYS.ALLOWED_TASK]: 'scraping'
		});

		const policy = await loadAgentPolicy(client, 'Agent-01.User.eth');

		expect(policy).toEqual({
			name: 'agent-01.user.eth',
			maxBudget: parseEther('0.05'),
			allowedTask: 'scraping'
		});
	});

	it('returns null fields when records are unset (caller escalates)', async () => {
		const client = mockClient(null);

		const policy = await loadAgentPolicy(client, 'agent-01.user.eth');

		expect(policy).toEqual({
			name: 'agent-01.user.eth',
			maxBudget: null,
			allowedTask: null
		});
	});

	it('propagates InvalidEnsBudgetError when the budget record is malformed', async () => {
		const client = mockClientByKey({
			[ENS_TEXT_KEYS.MAX_BUDGET]: 'banana',
			[ENS_TEXT_KEYS.ALLOWED_TASK]: 'scraping'
		});

		await expect(loadAgentPolicy(client, 'agent-01.user.eth')).rejects.toBeInstanceOf(
			InvalidEnsBudgetError
		);
	});
});

const VENDOR_LOWER = '0x06b737d82849e00ed28aa999710ae3b72c1b7038';
const VENDOR_CHECKSUMMED = '0x06B737D82849e00eD28aa999710ae3b72c1b7038';

function mockResolver(opts: {
	address: string | null;
	records?: Record<string, string | null>;
}): EnsResolver {
	const records = opts.records ?? {};
	return {
		getEnsText: vi.fn(({ key }: { key: string }) => Promise.resolve(records[key] ?? null)),
		getEnsAddress: vi.fn(() => Promise.resolve(opts.address))
	};
}

describe('loadVendor', () => {
	it('resolves payee (checksummed), price in wei, and service description', async () => {
		const client = mockResolver({
			address: VENDOR_LOWER,
			records: { [ENS_TEXT_KEYS.PRICE]: '0.02', [ENS_TEXT_KEYS.SERVICE]: '2 nights, downtown' }
		});

		const vendor = await loadVendor(client, 'Hotel-NYC.vendors.eth');

		expect(vendor).toEqual({
			name: 'hotel-nyc.vendors.eth',
			payee: VENDOR_CHECKSUMMED,
			priceWei: parseEther('0.02'),
			service: '2 nights, downtown'
		});
	});

	it('leaves service undefined when the record is unset', async () => {
		const client = mockResolver({ address: VENDOR_LOWER, records: { [ENS_TEXT_KEYS.PRICE]: '1' } });

		const vendor = await loadVendor(client, 'hotel-nyc.vendors.eth');
		expect(vendor.service).toBeUndefined();
	});

	it('throws VendorResolutionError when no payee address is set', async () => {
		const client = mockResolver({ address: null, records: { [ENS_TEXT_KEYS.PRICE]: '1' } });

		await expect(loadVendor(client, 'hotel-nyc.vendors.eth')).rejects.toBeInstanceOf(
			VendorResolutionError
		);
	});

	it('throws VendorResolutionError when the price record is missing', async () => {
		const client = mockResolver({ address: VENDOR_LOWER });

		await expect(loadVendor(client, 'hotel-nyc.vendors.eth')).rejects.toThrow(/price/i);
	});

	it('throws VendorResolutionError when the price is not a valid amount', async () => {
		const client = mockResolver({
			address: VENDOR_LOWER,
			records: { [ENS_TEXT_KEYS.PRICE]: 'free' }
		});

		await expect(loadVendor(client, 'hotel-nyc.vendors.eth')).rejects.toBeInstanceOf(
			VendorResolutionError
		);
	});
});
