import { describe, it, expect } from 'vitest';
import { parseEther } from 'viem';
import { evaluateAction, type ProposedAction } from './budget-guard';
import { transition } from './state-machine';
import type { AgentPolicy } from '../utils/ens';

const policy = (overrides: Partial<AgentPolicy> = {}): AgentPolicy => ({
	name: 'agent-01.user.eth',
	maxBudget: parseEther('0.1'),
	allowedTask: 'scraping',
	...overrides
});

const action = (overrides: Partial<ProposedAction> = {}): ProposedAction => ({
	taskType: 'scraping',
	costWei: parseEther('0.05'),
	...overrides
});

describe('evaluateAction — autonomous (WITHIN_BUDGET)', () => {
	it('stays autonomous when under budget and the task is allowed', () => {
		expect(evaluateAction(policy(), action())).toBe('WITHIN_BUDGET');
	});

	it('treats cost exactly equal to the budget as within budget (boundary)', () => {
		expect(evaluateAction(policy(), action({ costWei: parseEther('0.1') }))).toBe('WITHIN_BUDGET');
	});

	it('matches the task type case-insensitively and ignoring surrounding space', () => {
		const p = policy({ allowedTask: 'Scraping' });
		expect(evaluateAction(p, action({ taskType: '  scraping ' }))).toBe('WITHIN_BUDGET');
	});

	it('allows a zero-cost allowed task under a zero budget', () => {
		const p = policy({ maxBudget: 0n });
		expect(evaluateAction(p, action({ costWei: 0n }))).toBe('WITHIN_BUDGET');
	});
});

describe('evaluateAction — escalation (EXCEEDS_BUDGET)', () => {
	it('escalates when cost exceeds the budget by a single wei', () => {
		expect(evaluateAction(policy(), action({ costWei: parseEther('0.1') + 1n }))).toBe(
			'EXCEEDS_BUDGET'
		);
	});

	it('escalates a disallowed task even when it is cheap', () => {
		expect(evaluateAction(policy(), action({ taskType: 'trading', costWei: 1n }))).toBe(
			'EXCEEDS_BUDGET'
		);
	});

	it('escalates (fail safe) when max_budget is unset', () => {
		expect(evaluateAction(policy({ maxBudget: null }), action())).toBe('EXCEEDS_BUDGET');
	});

	it('escalates (fail safe) when allowed_task is unset', () => {
		expect(evaluateAction(policy({ allowedTask: null }), action())).toBe('EXCEEDS_BUDGET');
	});

	it('escalates on a negative cost (invalid input never auto-approves)', () => {
		expect(evaluateAction(policy(), action({ costWei: -1n }))).toBe('EXCEEDS_BUDGET');
	});
});

describe('evaluateAction — drives the state machine from EVALUATING', () => {
	it('routes an autonomous action to EXECUTING', () => {
		const event = evaluateAction(policy(), action());
		expect(transition('EVALUATING', event)).toBe('EXECUTING');
	});

	it('routes an over-budget action to AWAITING_LEDGER_SIGNATURE', () => {
		const event = evaluateAction(policy(), action({ costWei: parseEther('5') }));
		expect(transition('EVALUATING', event)).toBe('AWAITING_LEDGER_SIGNATURE');
	});
});
