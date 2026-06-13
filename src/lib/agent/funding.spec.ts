import { describe, it, expect } from 'vitest';
import { parseEther } from 'viem';
import { decideFunding } from './funding';
import { transition } from './state-machine';
import type { ProposedAction } from './budget-guard';
import type { AgentPolicy } from '../utils/ens';

const policy = (overrides: Partial<AgentPolicy> = {}): AgentPolicy => ({
	name: 'agent-01.user.eth',
	maxBudget: parseEther('1'), // pool cap
	escalationThreshold: parseEther('0.1'), // per-action ceiling
	allowedTasks: ['book_hotel'],
	...overrides
});

const action = (overrides: Partial<ProposedAction> = {}): ProposedAction => ({
	taskType: 'book_hotel',
	costWei: parseEther('0.05'),
	...overrides
});

describe('decideFunding — pool-funded', () => {
	it('funds from the pool when allowed, under threshold, and within remaining pool', () => {
		const d = decideFunding(policy(), action(), 0n);
		expect(d).toMatchObject({ source: 'POOL', event: 'WITHIN_BUDGET', reason: 'pool' });
	});

	it('treats cost exactly at the threshold as pool-funded (boundary)', () => {
		const d = decideFunding(policy(), action({ costWei: parseEther('0.1') }), 0n);
		expect(d.source).toBe('POOL');
	});

	it('with no escalation_threshold set, only the pool cap gates', () => {
		const d = decideFunding(policy({ escalationThreshold: null }), action({ costWei: parseEther('0.9') }), 0n);
		expect(d.source).toBe('POOL');
	});

	it('reports the remaining pool capacity', () => {
		const d = decideFunding(policy(), action(), parseEther('0.4'));
		expect(d.remainingPool).toBe(parseEther('0.6'));
	});
});

describe('decideFunding — escalates to Ledger', () => {
	it('escalates when a single action exceeds the per-action threshold', () => {
		const d = decideFunding(policy(), action({ costWei: parseEther('0.1') + 1n }), 0n);
		expect(d).toMatchObject({ source: 'ESCALATE', event: 'EXCEEDS_BUDGET', reason: 'over-threshold' });
	});

	it('escalates when the action would overspend the remaining pool', () => {
		// 0.05 under threshold, but only 0.04 left in the pool.
		const d = decideFunding(policy(), action({ costWei: parseEther('0.05') }), parseEther('0.96'));
		expect(d).toMatchObject({ source: 'ESCALATE', reason: 'pool-exhausted' });
	});

	it('escalates a task that is not allowed', () => {
		const d = decideFunding(policy(), action({ taskType: 'wire_transfer' }), 0n);
		expect(d).toMatchObject({ source: 'ESCALATE', reason: 'task-not-allowed' });
	});

	it('escalates (fail safe) when no pool budget is configured', () => {
		const d = decideFunding(policy({ maxBudget: null }), action(), 0n);
		expect(d).toMatchObject({ source: 'ESCALATE', reason: 'no-budget' });
	});

	it('escalates on a negative cost (invalid input never auto-funds)', () => {
		const d = decideFunding(policy(), action({ costWei: -1n }), 0n);
		expect(d).toMatchObject({ source: 'ESCALATE', reason: 'invalid-cost' });
	});
});

describe('decideFunding — drives the state machine', () => {
	it('a pool decision routes EVALUATING -> EXECUTING', () => {
		const d = decideFunding(policy(), action(), 0n);
		expect(transition('EVALUATING', d.event)).toBe('EXECUTING');
	});

	it('an escalate decision routes EVALUATING -> AWAITING_LEDGER_SIGNATURE', () => {
		const d = decideFunding(policy(), action({ costWei: parseEther('5') }), 0n);
		expect(transition('EVALUATING', d.event)).toBe('AWAITING_LEDGER_SIGNATURE');
	});
});
